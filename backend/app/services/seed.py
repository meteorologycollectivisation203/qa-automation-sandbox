import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.bookmark import Bookmark
from app.models.comment import Comment
from app.models.conversation import Conversation, ConversationParticipant
from app.models.follow import Follow
from app.models.hashtag import Hashtag, post_hashtags
from app.models.like import Like
from app.models.message import Message
from app.models.notification import Notification
from app.models.post import Post
from app.models.user import User

# Deterministic UUIDs for reproducible seed data
USER_IDS = {
    "admin": uuid.UUID("00000000-0000-0000-0000-000000000001"),
    "moderator": uuid.UUID("00000000-0000-0000-0000-000000000002"),
    "alice": uuid.UUID("00000000-0000-0000-0000-000000000003"),
    "bob": uuid.UUID("00000000-0000-0000-0000-000000000004"),
    "carol": uuid.UUID("00000000-0000-0000-0000-000000000005"),
    "dave": uuid.UUID("00000000-0000-0000-0000-000000000006"),
    "eve": uuid.UUID("00000000-0000-0000-0000-000000000007"),
    "frank": uuid.UUID("00000000-0000-0000-0000-000000000008"),
}

POST_IDS = {f"post_{i}": uuid.UUID(f"10000000-0000-0000-0000-{i:012d}") for i in range(1, 30)}
COMMENT_IDS = {f"comment_{i}": uuid.UUID(f"20000000-0000-0000-0000-{i:012d}") for i in range(1, 40)}
HASHTAG_IDS = {f"tag_{i}": uuid.UUID(f"30000000-0000-0000-0000-{i:012d}") for i in range(1, 15)}
CONV_IDS = {f"conv_{i}": uuid.UUID(f"40000000-0000-0000-0000-{i:012d}") for i in range(1, 5)}

NOW = datetime.now(timezone.utc)


def _ts(days_ago: int = 0, hours_ago: int = 0, minutes_ago: int = 0) -> datetime:
    return NOW - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)


async def seed_data(db: AsyncSession) -> None:
    # ── Users ──
    users = [
        User(
            id=USER_IDS["admin"], email="admin@buzzhive.com", username="admin",
            password_hash=hash_password("admin123"), display_name="Admin",
            bio="Platform administrator", role="admin", is_verified=True, created_at=_ts(90),
        ),
        User(
            id=USER_IDS["moderator"], email="mod@buzzhive.com", username="moderator",
            password_hash=hash_password("mod123"), display_name="Moderator",
            bio="Content moderator", role="moderator", is_verified=True, created_at=_ts(85),
        ),
        User(
            id=USER_IDS["alice"], email="alice@buzzhive.com", username="alice_dev",
            password_hash=hash_password("alice123"), display_name="Alice Developer",
            bio="Full-stack dev. Coffee lover ☕ Open source contributor.", role="user",
            is_verified=True, created_at=_ts(80),
        ),
        User(
            id=USER_IDS["bob"], email="bob@buzzhive.com", username="bob_photo",
            password_hash=hash_password("bob123"), display_name="Bob Photographer",
            bio="📸 Capturing moments. Travel & nature photography.", role="user",
            created_at=_ts(75),
        ),
        User(
            id=USER_IDS["carol"], email="carol@buzzhive.com", username="carol_writes",
            password_hash=hash_password("carol123"), display_name="Carol Writer",
            bio="Technical writer & blogger. Words matter.", role="user",
            created_at=_ts(70),
        ),
        User(
            id=USER_IDS["dave"], email="dave@buzzhive.com", username="dave_quiet",
            password_hash=hash_password("dave123"), display_name="Dave Quiet",
            bio="Introvert. Mostly lurking.", role="user", is_private=True,
            created_at=_ts(65),
        ),
        User(
            id=USER_IDS["eve"], email="eve@buzzhive.com", username="eve_new",
            password_hash=hash_password("eve123"), display_name="Eve Newbie",
            bio="Just joined! Excited to be here 🎉", role="user",
            created_at=_ts(2),
        ),
        User(
            id=USER_IDS["frank"], email="frank@buzzhive.com", username="frank_banned",
            password_hash=hash_password("frank123"), display_name="Frank Banned",
            bio="This account has been suspended", role="user", is_active=False,
            created_at=_ts(60),
        ),
    ]
    db.add_all(users)
    await db.flush()

    # ── Hashtags ──
    tag_names = ["coding", "photography", "testing", "automation", "buzzhive",
                 "qa", "devlife", "nature", "tech", "hello"]
    hashtags = {}
    for i, name in enumerate(tag_names, 1):
        h = Hashtag(id=HASHTAG_IDS[f"tag_{i}"], name=name, posts_count=0, created_at=_ts(80))
        hashtags[name] = h
        db.add(h)
    await db.flush()

    # ── Follows ──
    follows_data = [
        (USER_IDS["alice"], USER_IDS["bob"], "accepted"),
        (USER_IDS["alice"], USER_IDS["carol"], "accepted"),
        (USER_IDS["alice"], USER_IDS["dave"], "accepted"),
        (USER_IDS["alice"], USER_IDS["admin"], "accepted"),
        (USER_IDS["bob"], USER_IDS["alice"], "accepted"),
        (USER_IDS["bob"], USER_IDS["carol"], "accepted"),
        (USER_IDS["bob"], USER_IDS["admin"], "accepted"),
        (USER_IDS["carol"], USER_IDS["alice"], "accepted"),
        (USER_IDS["carol"], USER_IDS["bob"], "accepted"),
        (USER_IDS["carol"], USER_IDS["dave"], "pending"),  # Dave is private
        (USER_IDS["admin"], USER_IDS["alice"], "accepted"),
        (USER_IDS["admin"], USER_IDS["bob"], "accepted"),
        (USER_IDS["admin"], USER_IDS["carol"], "accepted"),
        (USER_IDS["moderator"], USER_IDS["alice"], "accepted"),
        (USER_IDS["eve"], USER_IDS["alice"], "accepted"),
        (USER_IDS["frank"], USER_IDS["alice"], "accepted"),
        (USER_IDS["bob"], USER_IDS["dave"], "accepted"),  # Dave accepted Bob
    ]
    for follower_id, following_id, status in follows_data:
        db.add(Follow(follower_id=follower_id, following_id=following_id, status=status, created_at=_ts(50)))
    await db.flush()

    # ── Posts ──
    posts_data = [
        # Alice's posts (8)
        (POST_IDS["post_1"], USER_IDS["alice"], "Just deployed a new feature! 🚀 #coding #devlife",
         None, True, _ts(30)),
        (POST_IDS["post_2"], USER_IDS["alice"], "Anyone else love debugging at 2am? No? Just me? 😅 #coding",
         None, False, _ts(25)),
        (POST_IDS["post_3"], USER_IDS["alice"], "Great talk at the tech meetup today! #tech",
         None, False, _ts(20)),
        (POST_IDS["post_4"], USER_IDS["alice"],
         "Hot take: tabs > spaces. Fight me. #coding #devlife",
         None, False, _ts(15)),
        (POST_IDS["post_5"], USER_IDS["alice"],
         "Working on an open source testing framework. Stay tuned! #testing #automation #qa",
         None, False, _ts(10)),
        (POST_IDS["post_6"], USER_IDS["alice"],
         "Coffee count today: ☕☕☕☕☕ (this is fine)",
         None, False, _ts(5)),
        (POST_IDS["post_7"], USER_IDS["alice"], "Hello BuzzHive! #hello #buzzhive",
         None, False, _ts(3)),
        (POST_IDS["post_8"], USER_IDS["alice"],
         "Test automation tip: always use data-testid attributes for stable selectors! #testing #automation",
         None, False, _ts(1)),
        # Bob's posts (5) - photography themed
        (POST_IDS["post_9"], USER_IDS["bob"], "Golden hour magic ✨ #photography #nature",
         "/uploads/images/sample1.jpg", False, _ts(28)),
        (POST_IDS["post_10"], USER_IDS["bob"], "Mountain sunrise this morning 🏔️ #photography #nature",
         "/uploads/images/sample2.jpg", False, _ts(22)),
        (POST_IDS["post_11"], USER_IDS["bob"], "Street photography is underrated #photography",
         "/uploads/images/sample3.jpg", False, _ts(18)),
        (POST_IDS["post_12"], USER_IDS["bob"], "New camera arrived! Can't wait to test it 📷",
         None, False, _ts(8)),
        (POST_IDS["post_13"], USER_IDS["bob"], "Macro lens world is incredible #photography #nature",
         "/uploads/images/sample4.jpg", False, _ts(4)),
        # Carol's posts (4) - writing themed
        (POST_IDS["post_14"], USER_IDS["carol"],
         "Writing good documentation is an art form. Here are my top 5 tips for technical writing:\n\n"
         "1. Know your audience\n2. Use clear, simple language\n3. Include examples\n"
         "4. Structure with headings\n5. Review and iterate\n\n#tech #devlife",
         None, False, _ts(26)),
        (POST_IDS["post_15"], USER_IDS["carol"],
         "The best code is self-documenting, but the best projects still have great docs. #coding #tech",
         None, False, _ts(17)),
        (POST_IDS["post_16"], USER_IDS["carol"],
         "Started a new blog series on API design patterns. Link in bio! #tech #coding",
         None, False, _ts(9)),
        (POST_IDS["post_17"], USER_IDS["carol"],
         "Unpopular opinion: README files should be updated BEFORE the PR is merged, not after. #devlife",
         None, False, _ts(6)),
        # Dave's posts (2) - private account
        (POST_IDS["post_18"], USER_IDS["dave"], "Quiet Sunday reading 📚",
         None, False, _ts(14), "followers_only"),
        (POST_IDS["post_19"], USER_IDS["dave"], "Sometimes the best code is no code at all.",
         None, False, _ts(7), "followers_only"),
        # Admin posts (3)
        (POST_IDS["post_20"], USER_IDS["admin"],
         "Welcome to BuzzHive! 🐝 This is a QA sandbox — feel free to test everything! #buzzhive #hello",
         None, True, _ts(89)),
        (POST_IDS["post_21"], USER_IDS["admin"],
         "Reminder: You can reset the database anytime via POST /api/reset #buzzhive",
         None, False, _ts(60)),
        (POST_IDS["post_22"], USER_IDS["admin"],
         "New features: reactions, bookmarks, and group messages! #buzzhive",
         None, False, _ts(30)),
        # Moderator post
        (POST_IDS["post_23"], USER_IDS["moderator"],
         "Keeping things tidy around here 🧹 #buzzhive",
         None, False, _ts(40)),
        # Edge case posts
        (POST_IDS["post_24"], USER_IDS["alice"],
         "A" * 2000,  # Max length post
         None, False, _ts(2)),
        (POST_IDS["post_25"], USER_IDS["bob"],
         "Unicode test: 你好世界 🌍 مرحبا العالم Привет мир 🇯🇵🇫🇷🇧🇷 "
         "Emojis: 😀😂🤣😍🤔🙄😴💀👻🤖 Special: <script>alert('xss')</script> "
         "SQL: '; DROP TABLE posts; -- End of test.",
         None, False, _ts(1, 12)),
        # Soft-deleted post (for moderation testing)
        (POST_IDS["post_26"], USER_IDS["frank"],
         "This post was deleted by moderator for violating guidelines",
         None, False, _ts(55)),
    ]

    for post_data in posts_data:
        visibility = "public"
        if len(post_data) > 6:
            visibility = post_data[6]
        post = Post(
            id=post_data[0], author_id=post_data[1], content=post_data[2],
            image_url=post_data[3], is_pinned=post_data[4], created_at=post_data[5],
            updated_at=post_data[5], visibility=visibility,
        )
        if post_data[0] == POST_IDS["post_26"]:
            post.is_deleted = True
            post.deleted_by = USER_IDS["moderator"]
            post.deleted_reason = "Violation of community guidelines"
        db.add(post)
    await db.flush()

    # Update post likes/comments counts after we add them
    # ── Post-Hashtag associations ──
    tag_associations = {
        "post_1": ["coding", "devlife"],
        "post_2": ["coding"],
        "post_3": ["tech"],
        "post_4": ["coding", "devlife"],
        "post_5": ["testing", "automation", "qa"],
        "post_7": ["hello", "buzzhive"],
        "post_8": ["testing", "automation"],
        "post_9": ["photography", "nature"],
        "post_10": ["photography", "nature"],
        "post_11": ["photography"],
        "post_13": ["photography", "nature"],
        "post_14": ["tech", "devlife"],
        "post_15": ["coding", "tech"],
        "post_16": ["tech", "coding"],
        "post_17": ["devlife"],
        "post_20": ["buzzhive", "hello"],
        "post_21": ["buzzhive"],
        "post_22": ["buzzhive"],
        "post_23": ["buzzhive"],
    }
    for post_key, tags in tag_associations.items():
        for tag_name in tags:
            await db.execute(
                post_hashtags.insert().values(
                    post_id=POST_IDS[post_key], hashtag_id=hashtags[tag_name].id
                )
            )
            hashtags[tag_name].posts_count += 1
    await db.flush()

    # ── Comments ──
    comments_data = [
        # Comments on Alice's posts
        (COMMENT_IDS["comment_1"], POST_IDS["post_1"], USER_IDS["bob"],
         "Congrats! What feature?", None, _ts(29, 23)),
        (COMMENT_IDS["comment_2"], POST_IDS["post_1"], USER_IDS["carol"],
         "Awesome work Alice! 🎉", None, _ts(29, 22)),
        (COMMENT_IDS["comment_3"], POST_IDS["post_1"], USER_IDS["alice"],
         "Thanks! It's a new search feature with full-text support.", COMMENT_IDS["comment_1"], _ts(29, 21)),
        (COMMENT_IDS["comment_4"], POST_IDS["post_2"], USER_IDS["carol"],
         "Been there! 😂 Debugging at 2am hits different", None, _ts(24, 20)),
        (COMMENT_IDS["comment_5"], POST_IDS["post_2"], USER_IDS["admin"],
         "Please get some sleep 😴", None, _ts(24, 18)),
        (COMMENT_IDS["comment_6"], POST_IDS["post_4"], USER_IDS["bob"],
         "Spaces. This is the hill I die on.", None, _ts(14, 15)),
        (COMMENT_IDS["comment_7"], POST_IDS["post_4"], USER_IDS["carol"],
         "EditorConfig solves this debate.", None, _ts(14, 12)),
        (COMMENT_IDS["comment_8"], POST_IDS["post_4"], USER_IDS["alice"],
         "Fair point Carol 😄", COMMENT_IDS["comment_7"], _ts(14, 10)),
        (COMMENT_IDS["comment_9"], POST_IDS["post_5"], USER_IDS["moderator"],
         "This sounds amazing! Will it support parallel execution?", None, _ts(9, 20)),
        (COMMENT_IDS["comment_10"], POST_IDS["post_5"], USER_IDS["alice"],
         "Yes! That's one of the core features. Stay tuned 🚀", COMMENT_IDS["comment_9"], _ts(9, 18)),
        (COMMENT_IDS["comment_11"], POST_IDS["post_8"], USER_IDS["eve"],
         "Great tip! I'm just learning about test automation.", None, _ts(0, 20)),
        # Comments on Bob's posts
        (COMMENT_IDS["comment_12"], POST_IDS["post_9"], USER_IDS["alice"],
         "Stunning shot! 📸", None, _ts(27, 10)),
        (COMMENT_IDS["comment_13"], POST_IDS["post_9"], USER_IDS["carol"],
         "The colors are incredible", None, _ts(27, 8)),
        (COMMENT_IDS["comment_14"], POST_IDS["post_10"], USER_IDS["alice"],
         "Where was this taken?", None, _ts(21, 15)),
        (COMMENT_IDS["comment_15"], POST_IDS["post_10"], USER_IDS["bob"],
         "Mount Rainier! Woke up at 4am for this.", COMMENT_IDS["comment_14"], _ts(21, 12)),
        (COMMENT_IDS["comment_16"], POST_IDS["post_12"], USER_IDS["carol"],
         "Which model did you get?", None, _ts(7, 20)),
        (COMMENT_IDS["comment_17"], POST_IDS["post_13"], USER_IDS["admin"],
         "The detail in this is amazing!", None, _ts(3, 15)),
        # Comments on Carol's posts
        (COMMENT_IDS["comment_18"], POST_IDS["post_14"], USER_IDS["alice"],
         "Point 3 is so important! Examples make everything clearer.", None, _ts(25, 10)),
        (COMMENT_IDS["comment_19"], POST_IDS["post_14"], USER_IDS["bob"],
         "Bookmarked! Great tips.", None, _ts(25, 8)),
        (COMMENT_IDS["comment_20"], POST_IDS["post_15"], USER_IDS["alice"],
         "💯 Totally agree", None, _ts(16, 12)),
        (COMMENT_IDS["comment_21"], POST_IDS["post_17"], USER_IDS["bob"],
         "This is actually a really good point", None, _ts(5, 18)),
        (COMMENT_IDS["comment_22"], POST_IDS["post_17"], USER_IDS["admin"],
         "We enforce this in our team!", None, _ts(5, 15)),
        # Comments on admin posts
        (COMMENT_IDS["comment_23"], POST_IDS["post_20"], USER_IDS["alice"],
         "Hello! Excited to be here 🐝", None, _ts(88)),
        (COMMENT_IDS["comment_24"], POST_IDS["post_20"], USER_IDS["bob"],
         "Great platform!", None, _ts(87)),
        (COMMENT_IDS["comment_25"], POST_IDS["post_20"], USER_IDS["carol"],
         "Let's go! 🚀", None, _ts(86)),
        # Nested replies (3 levels deep for testing)
        (COMMENT_IDS["comment_26"], POST_IDS["post_4"], USER_IDS["bob"],
         "Nah, EditorConfig is just a bandaid", COMMENT_IDS["comment_7"], _ts(14, 9)),
        (COMMENT_IDS["comment_27"], POST_IDS["post_4"], USER_IDS["carol"],
         "It literally solves the problem though 🤷", COMMENT_IDS["comment_26"], _ts(14, 8)),
        # Edge case comments
        (COMMENT_IDS["comment_28"], POST_IDS["post_25"], USER_IDS["carol"],
         "Testing Unicode: 日本語テスト 🎌", None, _ts(1, 10)),
        (COMMENT_IDS["comment_29"], POST_IDS["post_1"], USER_IDS["dave"],
         "Nice!", None, _ts(29, 5)),
        # Soft-deleted comment
        (COMMENT_IDS["comment_30"], POST_IDS["post_1"], USER_IDS["frank"],
         "Spam content that was moderated", None, _ts(29)),
    ]

    for c_data in comments_data:
        comment = Comment(
            id=c_data[0], post_id=c_data[1], author_id=c_data[2],
            content=c_data[3], parent_comment_id=c_data[4], created_at=c_data[5],
            updated_at=c_data[5],
        )
        if c_data[0] == COMMENT_IDS["comment_30"]:
            comment.is_deleted = True
            comment.deleted_by = USER_IDS["moderator"]
        db.add(comment)
    await db.flush()

    # Update comments_count on posts
    post_comment_counts = {}
    for c_data in comments_data:
        if c_data[0] != COMMENT_IDS["comment_30"]:  # skip deleted
            pid = str(c_data[1])
            post_comment_counts[pid] = post_comment_counts.get(pid, 0) + 1

    for pid_str, count in post_comment_counts.items():
        pid = uuid.UUID(pid_str)
        from sqlalchemy import select as sa_select
        result = await db.execute(sa_select(Post).where(Post.id == pid))
        post = result.scalar_one_or_none()
        if post:
            post.comments_count = count
    await db.flush()

    # ── Likes ──
    likes_data = [
        # Post likes
        (USER_IDS["bob"], "post", POST_IDS["post_1"], "like"),
        (USER_IDS["carol"], "post", POST_IDS["post_1"], "love"),
        (USER_IDS["admin"], "post", POST_IDS["post_1"], "like"),
        (USER_IDS["moderator"], "post", POST_IDS["post_1"], "like"),
        (USER_IDS["eve"], "post", POST_IDS["post_1"], "wow"),
        (USER_IDS["dave"], "post", POST_IDS["post_1"], "like"),
        (USER_IDS["alice"], "post", POST_IDS["post_9"], "love"),
        (USER_IDS["carol"], "post", POST_IDS["post_9"], "love"),
        (USER_IDS["admin"], "post", POST_IDS["post_9"], "like"),
        (USER_IDS["alice"], "post", POST_IDS["post_10"], "wow"),
        (USER_IDS["carol"], "post", POST_IDS["post_10"], "love"),
        (USER_IDS["bob"], "post", POST_IDS["post_14"], "like"),
        (USER_IDS["alice"], "post", POST_IDS["post_14"], "love"),
        (USER_IDS["admin"], "post", POST_IDS["post_14"], "like"),
        (USER_IDS["alice"], "post", POST_IDS["post_15"], "like"),
        (USER_IDS["bob"], "post", POST_IDS["post_2"], "laugh"),
        (USER_IDS["carol"], "post", POST_IDS["post_2"], "laugh"),
        (USER_IDS["alice"], "post", POST_IDS["post_20"], "love"),
        (USER_IDS["bob"], "post", POST_IDS["post_20"], "like"),
        (USER_IDS["carol"], "post", POST_IDS["post_20"], "like"),
        (USER_IDS["bob"], "post", POST_IDS["post_5"], "like"),
        (USER_IDS["moderator"], "post", POST_IDS["post_5"], "love"),
        (USER_IDS["alice"], "post", POST_IDS["post_17"], "like"),
        (USER_IDS["bob"], "post", POST_IDS["post_17"], "like"),
        (USER_IDS["alice"], "post", POST_IDS["post_22"], "like"),
        # Comment likes
        (USER_IDS["alice"], "comment", COMMENT_IDS["comment_1"], "like"),
        (USER_IDS["alice"], "comment", COMMENT_IDS["comment_2"], "love"),
        (USER_IDS["bob"], "comment", COMMENT_IDS["comment_3"], "like"),
        (USER_IDS["alice"], "comment", COMMENT_IDS["comment_6"], "laugh"),
        (USER_IDS["carol"], "comment", COMMENT_IDS["comment_8"], "like"),
    ]

    post_likes_count: dict[uuid.UUID, int] = {}
    comment_likes_count: dict[uuid.UUID, int] = {}

    for user_id, target_type, target_id, reaction in likes_data:
        db.add(Like(
            user_id=user_id, target_type=target_type, target_id=target_id,
            reaction=reaction, created_at=_ts(10),
        ))
        if target_type == "post":
            post_likes_count[target_id] = post_likes_count.get(target_id, 0) + 1
        else:
            comment_likes_count[target_id] = comment_likes_count.get(target_id, 0) + 1
    await db.flush()

    # Update like counts
    from sqlalchemy import select as sa_select
    for pid, count in post_likes_count.items():
        result = await db.execute(sa_select(Post).where(Post.id == pid))
        post = result.scalar_one_or_none()
        if post:
            post.likes_count = count
    for cid, count in comment_likes_count.items():
        result = await db.execute(sa_select(Comment).where(Comment.id == cid))
        comment = result.scalar_one_or_none()
        if comment:
            comment.likes_count = count
    await db.flush()

    # ── Bookmarks ──
    bookmarks = [
        (USER_IDS["alice"], POST_IDS["post_9"]),
        (USER_IDS["alice"], POST_IDS["post_10"]),
        (USER_IDS["alice"], POST_IDS["post_14"]),
        (USER_IDS["bob"], POST_IDS["post_14"]),
        (USER_IDS["bob"], POST_IDS["post_15"]),
    ]
    for user_id, post_id in bookmarks:
        db.add(Bookmark(user_id=user_id, post_id=post_id, created_at=_ts(5)))
    await db.flush()

    # ── Conversations & Messages ──
    # Conv 1: Alice <-> Bob (1:1)
    conv1 = Conversation(id=CONV_IDS["conv_1"], is_group=False, created_at=_ts(20), updated_at=_ts(0, 2))
    db.add(conv1)
    await db.flush()
    db.add(ConversationParticipant(conversation_id=CONV_IDS["conv_1"], user_id=USER_IDS["alice"], joined_at=_ts(20)))
    db.add(ConversationParticipant(
        conversation_id=CONV_IDS["conv_1"], user_id=USER_IDS["bob"], joined_at=_ts(20),
        last_read_at=_ts(0, 5),  # Bob has unread messages
    ))
    await db.flush()

    conv1_messages = [
        (USER_IDS["alice"], "Hey Bob! Love your photos 📸", _ts(20)),
        (USER_IDS["bob"], "Thanks Alice! Means a lot coming from you", _ts(19, 23)),
        (USER_IDS["alice"], "Want to collaborate on a project?", _ts(19, 20)),
        (USER_IDS["bob"], "Absolutely! What did you have in mind?", _ts(19, 18)),
        (USER_IDS["alice"], "I need photos for my testing framework docs", _ts(18)),
        (USER_IDS["bob"], "I'm in! Let me know the specs", _ts(17, 22)),
        (USER_IDS["alice"], "Will send details tomorrow 👍", _ts(17, 20)),
        (USER_IDS["bob"], "Sounds good!", _ts(17, 18)),
        (USER_IDS["alice"], "Here are the image size requirements: 1200x630 for social cards", _ts(1)),
        (USER_IDS["alice"], "And 800x400 for blog headers", _ts(0, 2)),
    ]
    for sender_id, content, created_at in conv1_messages:
        db.add(Message(
            conversation_id=CONV_IDS["conv_1"], sender_id=sender_id,
            content=content, created_at=created_at,
        ))

    # Conv 2: Alice <-> Carol (1:1)
    conv2 = Conversation(id=CONV_IDS["conv_2"], is_group=False, created_at=_ts(15), updated_at=_ts(3))
    db.add(conv2)
    await db.flush()
    db.add(ConversationParticipant(conversation_id=CONV_IDS["conv_2"], user_id=USER_IDS["alice"], joined_at=_ts(15)))
    db.add(ConversationParticipant(conversation_id=CONV_IDS["conv_2"], user_id=USER_IDS["carol"], joined_at=_ts(15)))
    await db.flush()

    conv2_messages = [
        (USER_IDS["alice"], "Carol, read your latest blog post. Great stuff!", _ts(15)),
        (USER_IDS["carol"], "Thank you! Took me a week to write 😅", _ts(14, 22)),
        (USER_IDS["alice"], "The API design patterns section was especially good", _ts(14, 20)),
        (USER_IDS["carol"], "That's my favorite part too!", _ts(14, 18)),
        (USER_IDS["alice"], "Want to co-author something on test architecture?", _ts(3)),
    ]
    for sender_id, content, created_at in conv2_messages:
        db.add(Message(
            conversation_id=CONV_IDS["conv_2"], sender_id=sender_id,
            content=content, created_at=created_at,
        ))

    # Conv 3: Group (Alice + Bob + Carol)
    conv3 = Conversation(
        id=CONV_IDS["conv_3"], is_group=True, name="Tech Squad 🚀",
        created_at=_ts(10), updated_at=_ts(1),
    )
    db.add(conv3)
    await db.flush()
    db.add(ConversationParticipant(conversation_id=CONV_IDS["conv_3"], user_id=USER_IDS["alice"], joined_at=_ts(10)))
    db.add(ConversationParticipant(conversation_id=CONV_IDS["conv_3"], user_id=USER_IDS["bob"], joined_at=_ts(10)))
    db.add(ConversationParticipant(conversation_id=CONV_IDS["conv_3"], user_id=USER_IDS["carol"], joined_at=_ts(10)))
    await db.flush()

    conv3_messages = [
        (USER_IDS["alice"], "Created this group for our collaboration!", _ts(10)),
        (USER_IDS["bob"], "Great idea! 🎉", _ts(9, 23)),
        (USER_IDS["carol"], "Love it! What's the plan?", _ts(9, 22)),
        (USER_IDS["alice"], "Let's plan a joint blog post + photos + testing framework demo", _ts(9, 20)),
        (USER_IDS["bob"], "I can handle all the visual content", _ts(9, 18)),
        (USER_IDS["carol"], "I'll write the technical narrative", _ts(9, 15)),
        (USER_IDS["alice"], "Perfect! I'll build the demo app. Let's target next month.", _ts(8)),
        (USER_IDS["bob"], "Works for me! 👍", _ts(1)),
    ]
    for sender_id, content, created_at in conv3_messages:
        db.add(Message(
            conversation_id=CONV_IDS["conv_3"], sender_id=sender_id,
            content=content, created_at=created_at,
        ))
    await db.flush()

    # ── Notifications (for alice) ──
    notifications = [
        (USER_IDS["alice"], USER_IDS["bob"], "like", "post", POST_IDS["post_1"], False, _ts(10)),
        (USER_IDS["alice"], USER_IDS["carol"], "like", "post", POST_IDS["post_1"], False, _ts(10)),
        (USER_IDS["alice"], USER_IDS["admin"], "like", "post", POST_IDS["post_1"], True, _ts(10)),
        (USER_IDS["alice"], USER_IDS["eve"], "follow", None, None, False, _ts(2)),
        (USER_IDS["alice"], USER_IDS["bob"], "comment", "post", POST_IDS["post_1"], True, _ts(29, 23)),
        (USER_IDS["alice"], USER_IDS["carol"], "comment", "post", POST_IDS["post_1"], True, _ts(29, 22)),
        (USER_IDS["alice"], USER_IDS["carol"], "comment", "post", POST_IDS["post_2"], False, _ts(24, 20)),
        (USER_IDS["alice"], USER_IDS["eve"], "comment", "post", POST_IDS["post_8"], False, _ts(0, 20)),
        (USER_IDS["alice"], USER_IDS["moderator"], "like", "post", POST_IDS["post_5"], True, _ts(9)),
        (USER_IDS["alice"], USER_IDS["bob"], "like", "post", POST_IDS["post_5"], False, _ts(9)),
        # Notifications for bob
        (USER_IDS["bob"], USER_IDS["alice"], "like", "post", POST_IDS["post_9"], True, _ts(10)),
        (USER_IDS["bob"], USER_IDS["carol"], "like", "post", POST_IDS["post_9"], False, _ts(10)),
        (USER_IDS["bob"], USER_IDS["alice"], "comment", "post", POST_IDS["post_9"], True, _ts(27, 10)),
        (USER_IDS["bob"], USER_IDS["carol"], "comment", "post", POST_IDS["post_9"], True, _ts(27, 8)),
        # Notifications for carol
        (USER_IDS["carol"], USER_IDS["alice"], "like", "post", POST_IDS["post_14"], True, _ts(10)),
        (USER_IDS["carol"], USER_IDS["bob"], "like", "post", POST_IDS["post_14"], False, _ts(10)),
        # Follow request notification for dave
        (USER_IDS["dave"], USER_IDS["carol"], "follow_request", None, None, False, _ts(50)),
    ]
    for n_data in notifications:
        db.add(Notification(
            user_id=n_data[0], actor_id=n_data[1], type=n_data[2],
            target_type=n_data[3], target_id=n_data[4], is_read=n_data[5],
            created_at=n_data[6],
        ))
    await db.flush()
