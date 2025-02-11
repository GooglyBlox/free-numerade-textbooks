# Free Numerade Textbooks

Get access to Numerade's textbook library through their own API. This project came about after discovering that Numerade has been hosting textbooks on public Google Drive links, with many seemingly obtained from shadow libraries.

## What's This?

While poking around Numerade's undocumented APIs, I found endpoints that give access to their entire textbook collection. Turns out they've been:
1. Storing all their textbooks on Google Drive with public "anyone with link" access
2. Getting some of their books from shadow libraries (though some are legit from places like LibreTexts)

This project lets you browse and access these textbooks using their own API. You'll need a premium Numerade account though.

## Deployment

This project is designed to be deployed on Vercel. To deploy:

1. Fork this repository
2. Create a new project on Vercel
3. Add your environment variables
```
NUMERADE_EMAIL=your_premium_email
NUMERADE_PASSWORD=your_premium_password
```
4. Deploy!

## Disclaimer

This project is a proof-of-concept demonstration of API exploration and public resource accessibility. It is intended for educational and research purposes only. Users are responsible for ensuring their use of this tool complies with applicable terms of service and laws.

This project is not affiliated with, endorsed by, or sponsored by Numerade.
