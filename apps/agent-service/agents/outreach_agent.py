"""
Outreach orchestration agent using LangGraph.
Coordinates: research → write → send → track
"""
import logging
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


class OutreachState(TypedDict):
    lead_id: str
    campaign_id: str
    user_id: str
    channel: str
    step_number: int
    sequence_id: Optional[str]
    enrollment_id: Optional[str]
    research: Optional[dict]
    generated_message: Optional[dict]
    send_result: Optional[dict]
    error: Optional[str]


async def research_node(state: OutreachState) -> OutreachState:
    from agents.lead_researcher import research_lead
    from models.schemas import LeadResearchRequest

    try:
        # In production: fetch lead from DB using lead_id
        # For now return state unchanged (DB client injected externally)
        logger.info(f"Research node: lead={state['lead_id']}")
        return state
    except Exception as e:
        return {**state, "error": str(e)}


async def write_message_node(state: OutreachState) -> OutreachState:
    from agents.message_writer import generate_message

    try:
        logger.info(f"Write node: lead={state['lead_id']} step={state['step_number']}")
        return state
    except Exception as e:
        return {**state, "error": str(e)}


async def send_message_node(state: OutreachState) -> OutreachState:
    try:
        logger.info(f"Send node: lead={state['lead_id']} channel={state['channel']}")
        return state
    except Exception as e:
        return {**state, "error": str(e)}


async def update_db_node(state: OutreachState) -> OutreachState:
    try:
        logger.info(f"DB update node: lead={state['lead_id']}")
        return state
    except Exception as e:
        return {**state, "error": str(e)}


def should_continue(state: OutreachState) -> str:
    if state.get("error"):
        return END
    return "write"


def build_outreach_graph():
    graph = StateGraph(OutreachState)
    graph.add_node("research", research_node)
    graph.add_node("write", write_message_node)
    graph.add_node("send", send_message_node)
    graph.add_node("update_db", update_db_node)

    graph.set_entry_point("research")
    graph.add_conditional_edges("research", should_continue, {"write": "write", END: END})
    graph.add_edge("write", "send")
    graph.add_edge("send", "update_db")
    graph.add_edge("update_db", END)

    return graph.compile()


outreach_graph = build_outreach_graph()
