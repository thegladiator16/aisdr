import logging

from fastapi import APIRouter, HTTPException

from models.schemas import ScoreSignalRequest, ScoreSignalResult
from services.signal_scorer import score_signal

logger = logging.getLogger(__name__)
router = APIRouter(tags=["signals"])


@router.post("/score-signal", response_model=ScoreSignalResult)
async def score_signal_endpoint(body: ScoreSignalRequest) -> ScoreSignalResult:
    try:
        return await score_signal(body.text, body.source)
    except ValueError as exc:
        logger.warning(
            "score_signal_bad_request",
            extra={"event": "score_signal_bad_request", "source": body.source, "error": str(exc)},
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except ConnectionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "score_signal_unexpected_error",
            extra={"event": "score_signal_unexpected_error", "source": body.source},
        )
        raise HTTPException(status_code=500, detail="Internal server error") from exc
