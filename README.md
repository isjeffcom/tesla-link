# tesla-link
Link to your Tesla car by nodejs.


# Installation
``` npm i ```
``` npm run serve ```

# Usage
Working progress, code is self explained

# Notice
THIS IS ABOUT LIFE, SECURITY MATTERS.

1. This is a working progress.
2. Be very careful to pass your credentials to the cloud. I personally recommand you deploy this software privately (and keep a low profile).
3. Currently only support one single owner authorization.


You will need to manually config your Tesla Owner Email and Password at: config.json

```
{
  "ACCOUNT_BASE": "https://auth.tesla.com",
  "CONTROL_BASE": "https://owner-api.teslamotors.com",
  "TESLA_CLIENT_ID": "81527cff06843c8634fdc09e8ac0abefb46ac849f38fe1e431c2ef2106796384",
  "TESLA_CLIENT_SECRET": "c7257eb71a564034f9419ee651c7d0e5f7aa6bfbd18bafb5c5c033b093bb2fa3",
  "EMAIL": "<Tesla_Email>", // e.g. jeff@mail.com
  "PASSWORD": "<Tesla_Password>" // e.g. 123456789
}
```