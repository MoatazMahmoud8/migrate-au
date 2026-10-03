"""Unit tests for is_official_law_or_direction / filter_official_notifications.

Run with: `python -m unittest backend.tests.test_official_filter -v`
"""

import os
import sys
import unittest

# Ensure `notify` is importable when running from repo root or backend/.
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

from notify import (  # noqa: E402
    filter_official_notifications,
    is_official_law_or_direction,
)


class OfficialFilterTests(unittest.TestCase):
    def test_home_affairs_visa_change_accepted(self):
        notif = {
            "title": "Subclass 189 visa fee increase from 1 July",
            "body": "The Department of Home Affairs has announced a visa application charge increase.",
            "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
            "category": "Visa Change",
            "source_id": "home_affairs_visa_189",
        }
        self.assertTrue(is_official_law_or_direction(notif))

    def test_structured_fee_change_accepted(self):
        notif = {
            "title": "Visa fee updated for subclass 500",
            "body": "$710 → $1,600",
            "url": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/fees-and-charges",
            "category": "Visa Fee Update",
            "source_id": "visa_fee_500",
        }
        self.assertTrue(is_official_law_or_direction(notif))

    def test_state_nomination_accepted(self):
        notif = {
            "title": "NSW 190 nomination criteria updated",
            "body": "Points threshold and priority occupations refreshed for FY.",
            "url": "https://www.nsw.gov.au/skilled-migration-nsw",
            "category": "State Nomination",
            "source_id": "state_nsw_190",
        }
        self.assertTrue(is_official_law_or_direction(notif))

    def test_skillselect_round_accepted(self):
        notif = {
            "title": "SkillSelect invitation round: 189 cutoff score 95",
            "body": "The latest invitation round has been published.",
            "url": "https://immi.homeaffairs.gov.au/skillselect",
            "category": "SkillSelect Round",
            "source_id": "skillselect_2026_08",
        }
        self.assertTrue(is_official_law_or_direction(notif))

    def test_media_opinion_rejected(self):
        notif = {
            "title": "Opinion: Why Australia's skilled migration program needs a rethink",
            "body": "Opinion piece by a columnist.",
            "url": "https://www.theguardian.com/australia-news/2026/opinion",
            "category": "News",
            "source_id": "guardian_opinion_001",
        }
        self.assertFalse(is_official_law_or_direction(notif))

    def test_personal_story_rejected_even_from_gov_domain(self):
        notif = {
            "title": "My journey from student visa to permanent residency",
            "body": "A migrant shares their success story with home affairs.",
            "url": "https://www.homeaffairs.gov.au/success-stories/abc",
            "category": "News",
            "source_id": "home_affairs_stories_abc",
        }
        self.assertFalse(is_official_law_or_direction(notif))

    def test_generic_news_from_media_rejected(self):
        notif = {
            "title": "Migration debate heats up in parliament",
            "body": "General political commentary on migration policy.",
            "url": "https://www.abc.net.au/news/2026-01-01/migration-debate/12345",
            "category": "News",
            "source_id": "abc_news_12345",
        }
        self.assertFalse(is_official_law_or_direction(notif))

    def test_generic_news_with_visa_keyword_from_media_rejected(self):
        notif = {
            "title": "Analysis: What the visa fee increase means for students",
            "body": "Editorial analysis.",
            "url": "https://www.sbs.com.au/news/2026/visa-fee-analysis",
            "category": "News",
            "source_id": "sbs_news_analysis",
        }
        # Not from an official domain and no structured content type — must be rejected.
        self.assertFalse(is_official_law_or_direction(notif))

    def test_official_domain_without_keyword_rejected_for_news(self):
        notif = {
            "title": "Corporate services annual report",
            "body": "The corporate arm publishes an annual report.",
            "url": "https://www.homeaffairs.gov.au/about-us/corporate/annual-report",
            "category": "News",
            # Non-scraper source id (e.g. syndicated via an RSS feed that
            # happens to point at a gov URL). Should be rejected because there
            # is no law/direction keyword and the category is News.
            "source_id": "rss_feed_generic_gov_link",
        }
        self.assertFalse(is_official_law_or_direction(notif))

    def test_filter_batch_returns_only_official(self):
        notifs = [
            {  # accepted
                "title": "Ministerial direction 111 issued",
                "body": "New ministerial direction on visa refusals",
                "url": "https://immi.homeaffairs.gov.au/legal/ministerial-directions/direction-111",
                "category": "Policy Update",
                "source_id": "ministerial_direction_111",
            },
            {  # rejected — story
                "title": "Success story: PR after 5 years",
                "body": "How I got my permanent residency",
                "url": "https://www.migrationblog.com/success-stories/pr",
                "category": "News",
                "source_id": "migration_blog_pr",
            },
            {  # accepted — structured fee change
                "title": "Assessment fee updated for VETASSESS",
                "body": "AUD 1050 → AUD 1150",
                "url": "https://www.vetassess.com.au/fees",
                "category": "Assessment Fee Update",
                "source_id": "assessment_fee_vetassess",
            },
        ]
        accepted = filter_official_notifications(notifs)
        self.assertEqual(len(accepted), 2)
        self.assertEqual(accepted[0]["source_id"], "ministerial_direction_111")
        self.assertEqual(accepted[1]["source_id"], "assessment_fee_vetassess")

    def test_none_and_invalid_shape_rejected(self):
        self.assertFalse(is_official_law_or_direction(None))
        self.assertFalse(is_official_law_or_direction("not-a-dict"))
        self.assertFalse(is_official_law_or_direction({}))


if __name__ == "__main__":
    unittest.main()
