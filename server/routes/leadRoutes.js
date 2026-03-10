import express from 'express';
import Lead from '../models/Lead.js';
import Link from '../models/Link.js';
import Workspace from '../models/Workspace.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { checkPlanLimits, enforceLeadLimit } from '../middleware/workspaceLimit.js';
import mongoose from "mongoose";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";


const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Get all leads with optional filters
router.get('/', protect, async (req, res) => {
  try {
    const { status, platform, source, startDate, endDate, search, page = 1, limit = 10 } = req.query;

    const query = { workspaceId: req.user.workspaceId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (platform && platform !== 'all') {
      query.platform = platform;
    }
    if (source && source !== 'all') {
      if (source === 'External') {
        query.source = { $ne: 'Form' };
      } else if (source === 'Form') {
        query.source = 'Form';
      }
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (search) {
      const or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { number: { $regex: search, $options: "i" } },
        { link: { $regex: search, $options: "i" } },

        // Partial match on _id (string version)
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: search,
              options: "i"
            }
          }
        }
      ];

      // Exact match if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(search)) {
        or.push({ _id: search });
      }

      query.$or = or;
    }


    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leads = await Lead.find(query)
      .populate('linkId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Lead.countDocuments(query);

    res.json({
      success: true,
      data: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single lead by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, workspaceId: req.user.workspaceId }).populate('linkId');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new lead
router.post('/', protect, checkPlanLimits, enforceLeadLimit, async (req, res) => {
  try {
    const { name, number, link, source, linkId, email, platform, location, status } = req.body;

    const newLead = new Lead({
      workspaceId: req.user.workspaceId,
      name,
      number,
      link,
      linkId,
      email,
      platform,
      location,
      status: status || 'pending',
      source: source || 'External'
    });

    const savedLead = await newLead.save();

    // Increment leads used
    req.workspace.leadsThisMonth += 1;
    await req.workspace.save();

    // 👇 CREATE NOTIFICATION HERE
    await Notification.create({
      workspaceId: req.user.workspaceId,
      type: "lead",
      action: "created",
      refId: savedLead._id,
      actorId: req.user._id,   // who created it
      title: "New Lead",
      message: "Lead created",
      readBy: []
    });

    res.status(201).json({ success: true, data: savedLead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public endpoint to create lead (for form submissions)
router.post('/public', async (req, res) => {
  try {
    const { name, number, link, linkId, email, platform, location, status } = req.body;

    // Validate required fields
    if (!name && !email && !number) {
      return res.status(400).json({
        success: false,
        message: 'At least one of name, email, or number is required'
      });
    }

    // Find workspace via linkId and check limits
    let workspaceId = null;
    if (linkId) {
      const linkDoc = await Link.findById(linkId);
      if (linkDoc) {
        workspaceId = linkDoc.workspaceId;
        const workspace = await Workspace.findById(workspaceId);

        // Custom reset and limit check for public route
        if (workspace) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (workspace.lastLeadsReset < thirtyDaysAgo) {
            workspace.leadsThisMonth = 0;
            workspace.lastLeadsReset = new Date();
          }

          if (workspace.plan === 'free' && workspace.leadsThisMonth >= 2) {
            return res.status(403).json({ success: false, message: 'Owner has reached their free plan lead limit.' });
          }

          workspace.leadsThisMonth += 1;
          await workspace.save();
        }
      }
    }

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Valid linkId is required to associate a workspace' });
    }

    const newLead = new Lead({
      workspaceId,
      name: name || 'Anonymous',
      number: number || '0000000000',
      link: link || '',
      linkId: linkId || null,
      email: email || 'noemail@example.com',
      platform: platform || 'Website',
      location: location || '',
      status: status || 'pending',
      source: 'Form'
    });

    const savedLead = await newLead.save();

    // 👇 Attach lead to link daily stats
    if (linkId) {
      const linkDoc = await Link.findById(linkId);
      if (linkDoc) {
        const today = new Date().toISOString().slice(0, 10);

        let dayStat = linkDoc.stats.find(s => s.date === today);
        if (!dayStat) {
          dayStat = {
            date: today,
            pageViews: 0,
            clicks: 0,
            uniqueVisitors: 0,
            leads: []
          };
          linkDoc.stats.push(dayStat);
        }

        // prevent duplicates
        if (!dayStat.leads.includes(savedLead._id)) {
          dayStat.leads.push(savedLead._id);
        }

        // make sure mongoose saves nested array
        linkDoc.markModified("stats");
        await linkDoc.save();
      }
    }

    // 👇 CREATE NOTIFICATION HERE (public form, no user)
    await Notification.create({
      workspaceId,
      type: "lead",
      action: "created",
      refId: savedLead._id,
      actorId: null,           // system / public
      title: "New Lead",
      message: "Lead submitted",
      meta: {
        customerName: name || "Someone",
        source: platform || "Website"
      },
      readBy: []
    });

    res.status(201).json({ success: true, data: savedLead });
  } catch (error) {
    console.error("PUBLIC LEAD ERROR:", error); // 👈 ADD THIS
    res.status(500).json({ success: false, message: error.message });
  }
});

// import lead
router.post("/import", protect, checkPlanLimits, upload.single("file"), async (req, res) => {
  try {
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        let importedCount = 0;
        for (const row of results) {

          if (req.workspace.plan === 'free' && req.workspace.leadsThisMonth >= 100) {
            console.log("Free limit reached during import");
            break; // Stop importing when limit hit
          }

          const leadData = {
            workspaceId: req.user.workspaceId,
            name: row.Name,
            number: row.Number,
            email: row.Email,
            platform: row.Platform,
            status: row.Status || "pending",
            source: row.Source || "External",
            location: row.Location,
            createdAt: row["Created At"] ? new Date(row["Created At"]) : Date.now()
          };

          if (row.ID) {
            await Lead.updateOne(
              { _id: row.ID, workspaceId: req.user.workspaceId },
              { $set: leadData },
              { upsert: true }
            );
          } else {
            await Lead.create(leadData);
            importedCount++;
            req.workspace.leadsThisMonth += 1;
            await req.workspace.save(); // save within the loop or in bulk later, this is fine for now
          }
        }

        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `${results.length} leads imported or updated`
        });

      });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update lead
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, number, link, linkId, email, platform, location, status } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (number) updateData.number = number;
    if (link) updateData.link = link;
    if (linkId) updateData.linkId = linkId;
    if (email) updateData.email = email;
    if (platform) updateData.platform = platform;
    if (location) updateData.location = location;
    if (status) updateData.status = status;

    const updatedLead = await Lead.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.user.workspaceId },
      updateData,
      { new: true, runValidators: true }
    ).populate('linkId');

    if (!updatedLead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, data: updatedLead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete lead
router.delete('/:id', protect, async (req, res) => {
  try {
    const deletedLead = await Lead.findOneAndDelete({ _id: req.params.id, workspaceId: req.user.workspaceId });

    if (!deletedLead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const workspace = await mongoose.model("Workspace").findById(req.user.workspaceId);
    if (workspace && workspace.leadsThisMonth > 0) {
      workspace.leadsThisMonth -= 1;
      await workspace.save();
    }

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk delete leads
router.post('/bulk-delete', protect, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No lead IDs provided'
      });
    }

    const result = await Lead.deleteMany({ _id: { $in: ids }, workspaceId: req.user.workspaceId });

    const workspace = await mongoose.model("Workspace").findById(req.user.workspaceId);
    if (workspace && workspace.leadsThisMonth > 0) {
      workspace.leadsThisMonth = Math.max(0, workspace.leadsThisMonth - result.deletedCount);
      await workspace.save();
    }

    res.json({
      success: true,
      message: `${ids.length} leads deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


export default router;
