export function tag(id, category, percent = 1) {
    return { id, category, percent };
}

export function tagByName(gameData, name, percent = 1) {
    const found = Object.values(gameData.tags).find(t => t.name === name);
    if (!found) throw new Error(`Missing test tag: ${name}`);
    return {
        id: found.id,
        name: found.name,
        category: found.category,
        percent: found.category === 'Genre' ? percent : 1
    };
}

export function scriptByNames(gameData, names) {
    return names.map(name => tagByName(gameData, name));
}

export function countByCategory(tags) {
    return tags.reduce((counts, item) => {
        counts[item.category] = (counts[item.category] || 0) + 1;
        return counts;
    }, {});
}

export function isStoryElement(tag) {
    return tag.category !== 'Genre' && tag.category !== 'Setting';
}
