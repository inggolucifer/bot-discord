from playwright.sync_api import sync_playwright
import time
import json

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Mock API responses so the page doesn't error out
        def handle_route(route):
            request = route.request
            url = request.url
            print(f"Intercepted: {url}")
            if "sell-to-system" in url:
                route.fulfill(status=200, json={"success": True})
            elif "/api/market" in url:
                route.fulfill(status=200, json={"success": True, "data": []})
            elif "/api/inventory" in url:
                route.fulfill(status=200, json={"success": True, "data": [{"itemId": "item1", "name": "Kayu Test", "quantity": 10, "basePrice": 50, "priceCurrency": "copper"}]})
            else:
                route.continue_()

        page.route("**/api/market/**", handle_route)
        page.route("**/api/inventory**", handle_route)

        page.goto("http://localhost:3000/")
        page.wait_for_load_state("networkidle")

        # Inject auth state
        mock_token = "mock_token"
        mock_user = {"id": "123", "username": "TestUser", "avatar": ""}

        page.evaluate(f"localStorage.setItem('jianghu_token', '{mock_token}')")
        page.evaluate(f"localStorage.setItem('jianghu_user', JSON.stringify({json.dumps(mock_user)}))")
        page.evaluate("window.dispatchEvent(new Event('storage'))")

        page.goto("http://localhost:3000/market")
        page.wait_for_load_state("networkidle")
        time.sleep(2)

        print("Taking debug screenshot before click...")
        page.screenshot(path="/home/jules/verification/debug_market_before.png")

        print("Looking for Jual ke Sistem button...")
        try:
            btn = page.locator("button:has-text('Jual ke Sistem')")
            btn.click(timeout=3000)
            time.sleep(1)

            page.screenshot(path="/home/jules/verification/jual_modal_open.png")
            print("Successfully clicked and took screenshot!")
        except Exception as e:
            print(f"Failed to find or click button: {e}")

        browser.close()

if __name__ == "__main__":
    verify()
