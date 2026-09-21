// Uma/oka calculation shared by the score entry page and the admin
// post-event correction editor. Keeping this in one place means a fixed
// raw score always recalculates to the same result everywhere.

// players: [{ name, score (raw/素点) }, ...] length 4, scores must sum to 100000
// returns: [{ name, score, rank, recalculated, originalIndex }, ...] in input order
export function calculateGameScores(players) {
    const playersWithIndex = players.map((p, i) => ({ ...p, originalIndex: i }));

    // Sort descending to assign ranks
    const sorted = [...playersWithIndex].sort((a, b) => b.score - a.score);

    // Group by score to handle ties
    const groups = [];
    sorted.forEach(p => {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup[0].score === p.score) {
            lastGroup.push(p);
        } else {
            groups.push([p]);
        }
    });

    const rankBases = { 0: null, 1: 25000, 2: 35000, 3: 40000 }; // 0-based index maps to Rank 1, 2, 3, 4
    let sumOthers = 0;
    let rankCounter = 0;
    let topGroup = null;

    groups.forEach(group => {
        const currentRankIndex = rankCounter;
        const rank = currentRankIndex + 1;

        if (currentRankIndex === 0) {
            topGroup = group;
            group.forEach(p => p.rank = 1);
        } else {
            let baseSum = 0;
            for (let i = 0; i < group.length; i++) {
                const targetIndex = currentRankIndex + i; // 0=1st, 1=2nd, 2=3rd, 3=4th
                baseSum += (rankBases[targetIndex] || 0);
            }
            const avgBase = baseSum / group.length;

            group.forEach(p => {
                p.rank = rank;
                // specific requirement: Math.ceil for rounding up 2nd-4th
                p.recalculated = Math.ceil((p.score - avgBase) / 1000);
                sumOthers += p.recalculated;
            });
        }

        rankCounter += group.length;
    });

    if (topGroup) {
        const totalTopScore = -sumOthers;
        const count = topGroup.length;
        const baseTopScore = Math.floor(totalTopScore / count);
        const remainder = totalTopScore % count;

        topGroup.forEach((p, i) => {
            p.recalculated = baseTopScore + (i < remainder ? 1 : 0);
        });
    }

    return sorted;
}
