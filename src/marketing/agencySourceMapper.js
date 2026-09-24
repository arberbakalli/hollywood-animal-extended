const AUDIENCE_ID_BY_GAME_ID = Object.freeze({
    0: 'TF',
    1: 'TM',
    2: 'YF',
    3: 'YM',
    4: 'AF',
    5: 'AM',
});

const SCORE_KIND_BY_GAME_SCORE_TYPE = Object.freeze({
    0: 'balanced',
    1: 'artistic',
    2: 'commercial',
});

function unique(values) {
    return Array.from(new Set(values));
}

function normalizeGameAudienceTarget(target) {
    const audienceId = AUDIENCE_ID_BY_GAME_ID[target?.id];
    const scoreKind = SCORE_KIND_BY_GAME_SCORE_TYPE[target?.scoreType];

    if (!audienceId || !scoreKind) {
        return null;
    }

    return {
        audienceId,
        scoreKind,
        sourceAudienceId: target.id,
        sourceScoreType: target.scoreType,
    };
}

function normalizeGameAdAgency(sourceId, sourceAgency) {
    const audienceTargets = (sourceAgency?.audiences || [])
        .map(normalizeGameAudienceTarget)
        .filter(Boolean);

    return {
        id: sourceAgency?.id || sourceId,
        sourceId,
        quality: Number(sourceAgency?.quality ?? 0),
        budgetFactor: Number.parseFloat(sourceAgency?.budgetFactor ?? '1'),
        isVisibleFromStart: Boolean(sourceAgency?.isVisibleFromStart),
        releasePatternId: sourceAgency?.releasePatternInfo?.id || null,
        targets: unique(audienceTargets.map(target => target.audienceId)),
        scoreKinds: unique(audienceTargets.map(target => target.scoreKind)),
        audienceTargets,
    };
}

function normalizeGameAdAgencies(sourceAgencies) {
    return Object.entries(sourceAgencies || {})
        .map(([id, agency]) => normalizeGameAdAgency(id, agency));
}

const HACAgencySourceMapper = {
    AUDIENCE_ID_BY_GAME_ID,
    SCORE_KIND_BY_GAME_SCORE_TYPE,
    normalizeGameAdAgency,
    normalizeGameAdAgencies,
    normalizeGameAudienceTarget,
};

globalThis.HACAgencySourceMapper = HACAgencySourceMapper;
