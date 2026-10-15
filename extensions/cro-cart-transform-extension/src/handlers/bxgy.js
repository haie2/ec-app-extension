const TYPE = "bxgy";

export const bxgyHandler = {
    type: TYPE,

    groupKey: (line) => line.id,

    readCampaigns(input) {
        const envelope = input?.cartTransform?.bxgy?.jsonValue;
        return {
            campaigns: indexCampaigns(envelope),
            bytes: envelope == null ? 0 : JSON.stringify(envelope).length,
        };
    },

    run(lines, context) {
        return null;
    },
};

const indexCampaigns = (envelope) => {
    const map = new Map();
    const campaigns = envelope?.campaigns;
    if (!Array.isArray(campaigns)) return map;

    for (const campaign of campaigns) {
        if (campaign?.id) map.set(String(campaign.id), campaign);
    }
    return map;
};
