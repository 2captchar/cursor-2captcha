# 2captcha Integration
When you are writing scripts for Playwright, Puppeteer or Python and encounter a captcha:
1. Find the `sitekey` (look for `data-sitekey` or `googlekey`).
2. Use the `solve_recaptcha_v2` tool from the 2captcha MCP server.
3. Once you get the token, put it into the `g-recaptcha-response` field.
