import mongoose from "mongoose";

const CampaignSchema=new mongoose.Schema({
  title:{ type:String, required:true },
  description:{ type:String, required:true },
  goal:{ type:Number, required:true },
  raised:{ type:Number, default:0 },
  deadline:{ type:Date, required:true },
  status:{ type:String, enum:["Active", "Funded", "Overdue", "Completed", "Cancelled"], default:"Active" },
  progress:{ type:Number, default:0 },
  image:{ type:String, default:"" },
  createdAt:{ type:Date, default:Date.now }
});

export default mongoose.model("Campaign", CampaignSchema);
