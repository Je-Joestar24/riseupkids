const starCamService = require('../services/starCam.service');

async function trackRoundStarted(req, res, next) {
  try {
    const { childId, roundId, targetWord, mode, levelId, gameId, timestamp, metadata } = req.body || {};
    const data = await starCamService.trackStarCamEvent({
      parentUserId: req.user?._id,
      childId,
      eventType: 'ispy_round_started',
      payload: {
        roundId,
        targetWord,
        mode,
        levelId,
        gameId,
        timestamp,
        metadata,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Star Cam round started event tracked',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function trackTargetFound(req, res, next) {
  try {
    const {
      childId,
      roundId,
      targetWord,
      recognizedWord,
      attempts,
      durationSeconds,
      hintUsed,
      mode,
      levelId,
      timestamp,
      metadata,
    } = req.body || {};

    const data = await starCamService.trackStarCamEvent({
      parentUserId: req.user?._id,
      childId,
      eventType: 'ispy_target_found',
      payload: {
        roundId,
        targetWord,
        recognizedWord,
        attempts,
        durationSeconds,
        hintUsed,
        mode,
        levelId,
        timestamp,
        metadata,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Star Cam target found event tracked',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function trackGameCompleted(req, res, next) {
  try {
    const {
      childId,
      gameId,
      targets,
      durationSeconds,
      mode,
      levelId,
      devicePerformanceTier,
      timestamp,
      metadata,
    } = req.body || {};

    const data = await starCamService.trackStarCamEvent({
      parentUserId: req.user?._id,
      childId,
      eventType: 'ispy_game_completed',
      payload: {
        gameId,
        targets,
        durationSeconds,
        mode,
        levelId,
        devicePerformanceTier,
        timestamp,
        metadata,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Star Cam game completed event tracked',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getStarCamEvents(req, res, next) {
  try {
    const { childId, event, mode, page, limit } = req.query || {};
    const data = await starCamService.listStarCamEvents({
      parentUserId: req.user?._id,
      childId,
      event,
      mode,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Star Cam events retrieved successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  trackRoundStarted,
  trackTargetFound,
  trackGameCompleted,
  getStarCamEvents,
};
