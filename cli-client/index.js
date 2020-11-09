const clear = require('clear');

const welcomeMenu = require('./menus/welcome');
const mainMenu = require('./menus/main');

const MENU_STATES = {};
MENU_STATES.WELCOME = welcomeMenu(MENU_STATES);
MENU_STATES.MAIN = mainMenu(MENU_STATES);
MENU_STATES.EXIT = async () => {
  console.log('bye!');
};

async function main() {
  let currentState = MENU_STATES.WELCOME.main;

  /* eslint-disable no-await-in-loop */
  while (currentState !== MENU_STATES.EXIT) {
    try {
      // clear();
      currentState = await currentState();
    } catch (error) {
      if (error.isTtyError) {
        // Environment doesn't support inquiry library
      } else {
        // other error
      }
      console.log(error);
      break;
    }
  }
  /* eslint-disable no-await-in-loop */

  MENU_STATES.EXIT();

  process.exit(0);
}

main();
