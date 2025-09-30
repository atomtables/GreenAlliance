# The Green Alliance
app designed to make the adminstration and organisation of FRC teams just that much simpler. currently in canary dev coal mine, has like 2 features implemented. planned beta 2027 season.
## run?
`npm install`
`cp .env.example .env`
`npm run db:migrate`
`npm run db:seed`
`npm run build`
`node -r dotenv/config build/index.js`
## note:
- generate and migrate database after finishing the TODO
- rn the TODO is to create permissions that allow the user to access whatever they should be
- i created roles so in the code we'll make it so roles implicitly grant certain permissions
- probably also make it so you can explicitly revoke permissions from a lead (who might have TODO creation perms)
- implicit's all there so the permissions property in schema.ts (database schema) only tells what permissions are explicitly granted
- for now let's finish up the structure of the user
- take a look at auth.js cuz i took all the demo stuff and dumped it in there, basically we have to write actions with those functions as the body
- dont worry about all that for now tho because thats all frontend stuff
- you work on the backend ill work on the frontend and when we commit hopefully we dont have merge conflicts
- pray that the git doesnt get reset 😭🙏
