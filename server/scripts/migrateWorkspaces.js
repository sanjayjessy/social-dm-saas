import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Link from '../models/Link.js';
import Lead from '../models/Lead.js';
import Form from '../models/Form.js';
import ContactCard from '../models/ContactCard.js';
import Notification from '../models/Notification.js';

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const users = await User.find();
    let firstWorkspaceId = null;

    console.log(`Found ${users.length} users. Checking workspaces...`);

    for (const user of users) {
      if (!user.workspaceId) {
        const workspace = new Workspace({ ownerId: user._id, plan: 'free' });
        await workspace.save();
        
        user.workspaceId = workspace._id;
        await user.save();
        console.log(`Created workspace ${workspace._id} for user ${user.email}`);
        
        if (!firstWorkspaceId) {
          firstWorkspaceId = workspace._id;
        }
      } else if (!firstWorkspaceId) {
         firstWorkspaceId = user.workspaceId;
      }
    }

    if (firstWorkspaceId) {
      console.log(`Assigning all unassigned data to primary workspace ID: ${firstWorkspaceId}`);
      
      const linkUpdate = await Link.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: firstWorkspaceId } });
      console.log(`Updated ${linkUpdate.modifiedCount} Links`);

      const leadUpdate = await Lead.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: firstWorkspaceId } });
      console.log(`Updated ${leadUpdate.modifiedCount} Leads`);

      const formUpdate = await Form.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: firstWorkspaceId } });
      console.log(`Updated ${formUpdate.modifiedCount} Forms`);

      const ccUpdate = await ContactCard.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: firstWorkspaceId } });
      console.log(`Updated ${ccUpdate.modifiedCount} Contact Cards`);

      const notifUpdate = await Notification.updateMany({ workspaceId: { $exists: false } }, { $set: { workspaceId: firstWorkspaceId } });
      console.log(`Updated ${notifUpdate.modifiedCount} Notifications`);
    }

    // Backfill profileCardsUsed for all Workspaces
    const workspaces = await Workspace.find();
    console.log(`Updating profileCard limits for ${workspaces.length} workspaces...`);
    for (const ws of workspaces) {
      const cardCount = await ContactCard.countDocuments({ workspaceId: ws._id });
      ws.profileCardsUsed = cardCount;
      
      const formCount = await Form.countDocuments({ workspaceId: ws._id, isDeleted: { $ne: true } });
      ws.formsUsed = formCount;

      const linkCount = await Link.countDocuments({ workspaceId: ws._id, inTrash: { $ne: 'yes' } });
      ws.dmLinksUsed = linkCount;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const leadCount = await Lead.countDocuments({ 
        workspaceId: ws._id, 
        createdAt: { $gte: thirtyDaysAgo } 
      });
      ws.leadsThisMonth = leadCount;

      await ws.save();
    }

    console.log("Migration complete.");
    process.exit(0);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
