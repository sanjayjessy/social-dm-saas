import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workspace',
        required: true,
        index: true
    },
    link_name: {
        type: String,
        required: true,
        trim: true
    },
    clicks: {
        type: Number,
        default: 0
    },
    pageViews: {
        type: Number,
        default: 0
    },
    visitors: {
        type: [String], // store visitor IDs
        default: []
    },
    uniqueVisitors: {
        type: Number,
        default: 0
    },
    stats: [
        {
            date: { type: String }, // "2026-02-23"
            pageViews: { type: Number, default: 0 },
            clicks: { type: Number, default: 0 },
            uniqueVisitors: { type: Number, default: 0 },
            leads: [
                { type: mongoose.Schema.Types.ObjectId, ref: "Lead" }
            ]
        }
    ],
    status: {
        type: String,
        enum: ['active', 'paused'],
        default: 'active'
    },
    inTrash: {
        type: String,
        enum: ['yes', 'no'],
        default: 'no'
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    destinationType: {
        type: String,
        enum: ['url', 'form', 'whatsapp'],
        default: 'url'
    },
    link: {
        type: String,
        trim: true
    },
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form'
    },
    whatsappNumber: {
        type: String,
        trim: true
    },
    whatsappMessage: {
        type: String,
        trim: true
    },
    platform: {
        type: String,
        required: true,
        enum: ['Instagram', 'Facebook', 'Whatsapp', 'Youtube', 'Linkedin', 'Reddit', 'Telegram', 'Threads', 'TikTok', 'TwitterX'],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

linkSchema.index({ slug: 1 }, { unique: true });

const Link = mongoose.model('Link', linkSchema);

export default Link;
