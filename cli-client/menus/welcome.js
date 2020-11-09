const inquirer = require('inquirer');
const validator = require('validator');
const PasswordValidator = require('password-validator');

const client = require('../httpclient');

const passwordSchema = new PasswordValidator();
passwordSchema
  .is().min(8)
  .is().max(32)
  .has()
  .uppercase()
  .has()
  .lowercase()
  .has()
  .digits(1)
  .has()
  .symbols(1)
  .not()
  .spaces();

async function signup(states) {
  const questions = [
    {
      type: 'input',
      name: 'username',
      message: 'username',
      validate: (input) => !validator.isEmpty(input) || 'Username can\'t be empty',
    },
    {
      type: 'input',
      name: 'email',
      message: 'email',
      validate: (input) => validator.isEmail(input) || 'Invalid email',
    },
    {
      type: 'password',
      name: 'password',
      message: 'password',
      mask: '*',
      validate: (input) => passwordSchema.validate(input) || 'Password must be 8-32 characters (1 number, 1 capital, 1 lowercase, 1 special character)',
    },
  ];
  const answers = await inquirer
    .prompt(questions);

  const user = await client.signup(answers);
  return states.MAIN.main;
}

async function login(states) {
  const questions = [
    {
      type: 'input',
      name: 'username',
      message: 'username',
      validate: (input) => !validator.isEmpty(input) || 'Username can\'t be empty',
    },
    {
      type: 'password',
      name: 'password',
      message: 'password',
      mask: '*',
      validate: (input) => passwordSchema.validate(input) || 'Password must be 8-32 characters (1 number, 1 capital, 1 lowercase, 1 special character)',
    },
  ];
  const answers = await inquirer
    .prompt(questions);
  await client.login(answers);

  return states.MAIN.main;
}

async function main(states) {
  const welcomeMenu = {
    type: 'rawlist',
    name: 'welcomeMenu',
    message: 'choice:',
    default: 'signup',
    choices: [
      'signup',
      'login',
      'exit',
    ],
    prefix: '',
  };

  const answers = await inquirer
    .prompt([
      welcomeMenu,
    ]);

  switch (answers.welcomeMenu) {
    case 'signup':
      return states.WELCOME.signup;
    case 'login':
      return states.WELCOME.login;
    case 'exit':
      return states.EXIT;
    default:
      throw Error(`Invalid input to welcome menu: ${answers.welcomeMenu}`);
  }
}

module.exports = (states) => ({
  main: () => main(states),
  signup: () => signup(states),
  login: () => login(states),
});
