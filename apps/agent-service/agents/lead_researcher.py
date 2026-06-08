import anthropic
import httpx
import json
import asyncio
import logging
from typing import Optional
from models.schemas import LeadResearch, LeadResearchRequest
from prompts.research import LEAD_RESEARCH_SYSTEM, build_research_prompt

logger = logging.getLogger(__name__)
client = anthropic.AsyncAnthropic()


async def scrape_linkedin_profile(linkedin_url: str) -> str:
    if not linkedin_url:
        return ""
    try:
        handle = linkedin_url.rstrip("/").split("/")[-1]
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as http:
            response = await http.get(
                f"https://www.linkedin.com/in/{handle}",
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
                    )
                },
            )
            if response.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, "html.parser")
                meta = soup.find("meta", {"name": "description"})
                if meta:
                    return meta.get("content", "")
                title = soup.find("title")
                return title.get_text() if title else ""
    except Exception as e:
        logger.debug(f"LinkedIn scrape failed for {linkedin_url}: {e}")
    return ""


async def scrape_company_website(website: str) -> str:
    if not website:
        return ""
    try:
        url = website if website.startswith("http") else f"https://{website}"
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as http:
            response = await http.get(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
                    )
                },
            )
            if response.status_code == 200:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.text, "html.parser")
                texts = []
                for tag in ["h1", "h2", "h3", "p"]:
                    elements = soup.find_all(tag)
                    texts.extend([el.get_text(strip=True) for el in elements[:5]])
                return " ".join(filter(None, texts))[:3000]
    except Exception as e:
        logger.debug(f"Website scrape failed for {website}: {e}")
    return ""


async def research_lead(request: LeadResearchRequest) -> LeadResearch:
    results = await asyncio.gather(
        scrape_linkedin_profile(request.linkedin_url or ""),
        scrape_company_website(request.company_website or ""),
        return_exceptions=True,
    )

    linkedin_content = results[0] if isinstance(results[0], str) else ""
    website_content = results[1] if isinstance(results[1], str) else ""

    scraped = f"""LINKEDIN DATA:\n{linkedin_content or 'Not available'}\n\nCOMPANY WEBSITE:\n{website_content or 'Not available'}"""

    lead_dict = {
        "full_name": request.full_name,
        "job_title": request.job_title,
        "company_name": request.company_name,
        "linkedin_url": request.linkedin_url,
        "company_website": request.company_website,
    }

    for attempt in range(3):
        try:
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1000,
                system=LEAD_RESEARCH_SYSTEM,
                messages=[
                    {
                        "role": "user",
                        "content": build_research_prompt(lead_dict, scraped),
                    }
                ],
            )

            content = response.content[0].text.strip()
            if "```" in content:
                parts = content.split("```")
                content = parts[1] if len(parts) > 1 else content
                if content.startswith("json"):
                    content = content[4:]

            data = json.loads(content.strip())
            data["lead_id"] = request.lead_id
            return LeadResearch(**data)

        except (json.JSONDecodeError, Exception) as e:
            logger.warning(f"Research attempt {attempt + 1} failed: {e}")
            if attempt == 2:
                break
            await asyncio.sleep(1)

    return LeadResearch(
        lead_id=request.lead_id,
        research_summary=(
            f"{request.full_name} is {request.job_title or 'a leader'} "
            f"at {request.company_name}."
        ),
        icebreakers=[
            f"I came across {request.company_name} and was impressed by your work."
        ],
        pain_points=[],
        personality_notes="Professional",
        score=50,
        confidence=20,
    )
