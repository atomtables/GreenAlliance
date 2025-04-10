# FRC Green Alliance

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