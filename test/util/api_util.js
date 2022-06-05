const { StatusCodes } = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');

const { createUserCred } = require('./firebase');

function getPublicUserFromUser(user) {
  return {
    id: user.id,
    username: user.username,
  };
}

async function createGameAndAssert(t, api, userCred, user) {
  // TODO: we should switch from using tictactoe to runner/test_app backend where we
  // have more control over the backend behavior. We can force trigger errors, or other behaviors
  const gameRaw = {
    name: `integration-tests-${uuidv4()}`,
    description: 'test description',
    commitSHA: '3bc1743b0d7580a043884a5d6b9e0bffd64c1c61',
    githubURL: 'https://github.com/turnbasedgames/tictactoe',
  };
  const authToken = await userCred.user.getIdToken();
  const { data: { game }, status } = await api.post('/game', gameRaw, { headers: { authorization: authToken } });
  t.is(status, StatusCodes.CREATED);
  t.deepEqual(game.creator, user);
  Object.keys(gameRaw).forEach((key) => {
    t.is(gameRaw[key], game[key]);
  });
  return game;
}

async function createUserAndAssert(t, api, userCred) {
  const authToken = await userCred.user.getIdToken();
  const { data: { user }, status } = await api.post('/user', {}, { headers: { authorization: authToken } });
  t.is(status, StatusCodes.CREATED);
  t.is(user.firebaseId, userCred.user.uid);
  return user;
}

async function deleteUserAndAssert(t, api, userCred) {
  const authToken = await userCred.user.getIdToken();
  const { status } = await api.delete('/user', { headers: { authorization: authToken } });
  t.is(status, StatusCodes.OK);
}

async function createRoomAndAssert(t, api, userCred, game, user) {
  const authToken = await userCred.user.getIdToken();
  const { data: { room }, status } = await api.post('/room', { game: game.id }, { headers: { authorization: authToken } });
  t.is(status, StatusCodes.CREATED);
  t.deepEqual(room.game, game);
  t.is(room.joinable, true);
  t.deepEqual(room.players, [user].map(getPublicUserFromUser));
  t.deepEqual(room.latestState.state, {
    board: [
      [
        null,
        null,
        null,
      ],
      [
        null,
        null,
        null,
      ],
      [
        null,
        null,
        null,
      ],
    ],
    status: 'preGame',
    winner: null,
  });
  return room;
}

async function startTicTacToeRoom(t) {
  const { api } = t.context.app;
  const userCredOne = await createUserCred();
  const userCredTwo = await createUserCred();
  const userOne = await createUserAndAssert(t, api, userCredOne);
  const userTwo = await createUserAndAssert(t, api, userCredTwo);
  const authTokenTwo = await userCredTwo.user.getIdToken();
  const game = await createGameAndAssert(t, api, userCredOne, userOne);
  const room = await createRoomAndAssert(t, api, userCredOne, game, userOne);
  const { data: { room: resRoom }, status } = await api.post(`/room/${room.id}/join`, {},
    { headers: { authorization: authTokenTwo } });
  t.is(status, StatusCodes.OK);
  t.deepEqual(resRoom.game, game);
  t.is(resRoom.joinable, false);
  t.deepEqual(resRoom.players, [userOne, userTwo].map(getPublicUserFromUser));
  t.deepEqual(resRoom.latestState.state, {
    board: [
      [
        null,
        null,
        null,
      ],
      [
        null,
        null,
        null,
      ],
      [
        null,
        null,
        null,
      ],
    ],
    plrToMoveIndex: 0,
    status: 'inGame',
    winner: null,
  });
  return {
    userOne, userTwo, userCredOne, userCredTwo, game, room: resRoom,
  };
}

module.exports = {
  getPublicUserFromUser,
  createGameAndAssert,
  createRoomAndAssert,
  createUserAndAssert,
  deleteUserAndAssert,
  startTicTacToeRoom,
};
