#!/usr/bin/env python3
"""
Generates one small static HTML file per post in rosie.json, under share/<slug>.html.

WHY THIS EXISTS:
Link-unfurling bots (iMessage, Twitter/X, Discord, Slack, etc.) fetch a URL's raw
HTML and read its <meta> tags directly — they do NOT run JavaScript. Since
rosie.html is a single static page that builds everything client-side, there's no
way to give each post its own unique preview image/caption just by changing tags
with JS after the page loads; the bot never sees that.

So instead, each post gets its own tiny real HTML file with hard-coded, correct
meta tags (photo, caption, engagement) baked in at generation time. A human who
clicks the link gets redirected straight to the interactive post view
(rosie.html?post=<slug>); a bot generating a preview just reads the static tags
and never needs to run the redirect at all.

RUN THIS AGAIN whenever posts are added to rosie.json — it's not automatic.
Usage: python3 generate_share_pages.py
"""

import json
import os
import html

DOMAIN = "https://www.landonday.com"
SITE_DIR = os.path.dirname(os.path.abspath(__file__))
ROSIE_JSON = os.path.join(SITE_DIR, "rosie.json")
OUTPUT_DIR = os.path.join(SITE_DIR, "share")

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>queen_rosie: {title_escaped}</title>

<meta property="og:type" content="article">
<meta property="og:site_name" content="Rosie's Scratchboard">
<meta property="og:title" content="queen_rosie">
<meta property="og:description" content="{description_escaped}">
<meta property="og:image" content="{image_url}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:url" content="{share_url}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="queen_rosie">
<meta name="twitter:description" content="{description_escaped}">
<meta name="twitter:image" content="{image_url}">

<link rel="canonical" href="{share_url}">
<meta http-equiv="refresh" content="0; url={redirect_url}">
<script>window.location.replace({redirect_url_js});</script>
</head>
<body>
<p>Redirecting to <a href="{redirect_url}">this post on Rosie's Scratchboard</a>&hellip;</p>
</body>
</html>
"""


def build_description(post):
    caption = post["caption"]
    likes = post["likes"]
    comments = len(post["comments"])
    return f"{caption} \u00b7 \U0001F43E {likes} likes \u00b7 \U0001F4AC {comments} comments"


def main():
    with open(ROSIE_JSON, "r", encoding="utf-8") as f:
        posts = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    generated = []
    for post in posts:
        slug = os.path.splitext(post["image"])[0]
        description = build_description(post)
        redirect_url = f"../rosie.html?post={slug}"

        content = TEMPLATE.format(
            title_escaped=html.escape(post["caption"][:70]),
            description_escaped=html.escape(description),
            image_url=f"{DOMAIN}/assets/images/rosie/{post['image']}",
            share_url=f"{DOMAIN}/share/{slug}.html",
            redirect_url=redirect_url,
            redirect_url_js=json.dumps(redirect_url),
        )

        out_path = os.path.join(OUTPUT_DIR, f"{slug}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        generated.append(slug)

    print(f"Generated {len(generated)} share pages in {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
