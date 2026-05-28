import type { LeadStage } from "@/types/domain";

export const stageStyles: Record<
  LeadStage,
  {
    border: string;
    header: string;
    badge: string;
    accent: string;
  }
> = {
  new: {
    border: "border-[#D8CDC2]",
    header: "bg-[#F3EEE8]",
    badge: "bg-[#E9DED3] text-[#5F4B3B]",
    accent: "bg-[#B08968]",
  },
  no_response: {
    border: "border-[#DED6C7]",
    header: "bg-[#F5F1E8]",
    badge: "bg-[#E9E0CD] text-[#665B43]",
    accent: "bg-[#A89367]",
  },
  follow_up_1: {
    border: "border-[#D5D2C8]",
    header: "bg-[#F1F0EA]",
    badge: "bg-[#E4E1D6] text-[#565246]",
    accent: "bg-[#8F8A75]",
  },
  follow_up_2: {
    border: "border-[#D6CCC7]",
    header: "bg-[#F2ECE9]",
    badge: "bg-[#E6DAD5] text-[#5D4B44]",
    accent: "bg-[#8D7369]",
  },
  customer: {
    border: "border-[#CAD8CE]",
    header: "bg-[#EEF4F0]",
    badge: "bg-[#DDE9E1] text-[#3D5A46]",
    accent: "bg-[#6F8A73]",
  },
  return_7_days: {
    border: "border-[#CAD5D8]",
    header: "bg-[#EDF3F4]",
    badge: "bg-[#DCE7EA] text-[#405A61]",
    accent: "bg-[#6E8790]",
  },
  inactive_30_days: {
    border: "border-[#D8CBC8]",
    header: "bg-[#F4EEEC]",
    badge: "bg-[#E8DBD7] text-[#664E47]",
    accent: "bg-[#94786F]",
  },
  birthday_month: {
    border: "border-[#D7D0DC]",
    header: "bg-[#F2EEF5]",
    badge: "bg-[#E7DFEC] text-[#5D5065]",
    accent: "bg-[#8B7896]",
  },
};
