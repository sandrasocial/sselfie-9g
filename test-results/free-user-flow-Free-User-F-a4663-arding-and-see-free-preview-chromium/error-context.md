# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]: Create Your Account
      - generic [ref=e7]: Join SSELFIE and start creating stunning AI photos
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: Name
          - textbox "Name" [ref=e13]:
            - /placeholder: Your name
            - text: Free Test User
        - generic [ref=e14]:
          - generic [ref=e15]: Email
          - textbox "Email" [ref=e16]:
            - /placeholder: you@example.com
            - text: free-test-1768410757375@playwright.test
        - generic [ref=e17]:
          - generic [ref=e18]: Password
          - textbox "Password" [ref=e19]: TestPassword123!
        - button "Sign Up" [ref=e20]
      - generic [ref=e21]:
        - text: Already have an account?
        - link "Sign in" [ref=e22] [cursor=pointer]:
          - /url: /auth/login
  - button "Open Next.js Dev Tools" [ref=e28] [cursor=pointer]:
    - generic [ref=e31]:
      - text: Compiling
      - generic [ref=e32]:
        - generic [ref=e33]: .
        - generic [ref=e34]: .
        - generic [ref=e35]: .
  - alert [ref=e36]
```