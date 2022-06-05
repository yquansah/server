const test = require('ava');
const { StatusCodes } = require('http-status-codes');
const { Types } = require('mongoose');

const { spawnApp } = require('../util/app');
const { createUserCred } = require('../util/firebase');
const {
  getPublicUserFromUser,
  createUserAndAssert,
  createGameAndAssert,
  createRoomAndAssert,
  deleteUserAndAssert,
  startTicTacToeRoom,
} = require('../util/api_util');
const { createOrUpdateSideApps } = require('../util/util');

async function testOperationOnFinishedRoom(t, operation) {
  const { userCredOne, userCredTwo, room } = await startTicTacToeRoom(t);
  const { api } = t.context.app;
  const authTokenOne = await userCredOne.user.getIdToken();
  const authTokenTwo = await userCredTwo.user.getIdToken();

  // quit room which will force the room to be in finished state
  await api.post(`/room/${room.id}/quit`, undefined,
    { headers: { authorization: authTokenOne } });
  const { response: { status, data: { message, name } } } = await t.throwsAsync(api.post(`/room/${room.id}/${operation}`, undefined,
    { headers: { authorization: authTokenTwo } }));
  t.is(status, StatusCodes.BAD_REQUEST);
  t.is(name, 'RoomFinished');
  t.is(message, `${room.id} is no longer mutable because it is finished!`);
}

test.before(async (t) => {
  const app = await spawnApp();
  // eslint-disable-next-line no-param-reassign
  t.context.app = app;
  t.context.createdUsers = [];
});

test.after.always(async (t) => {
  const { app, sideApps, createdUsers } = t.context;
  const { api } = t.context.app;

  // delete users created during tests
  for (const userCred of createdUsers) {
    await deleteUserAndAssert(t, api, userCred);
  }

  await app.cleanup();
  if (sideApps) {
    await sideApps.cleanup();
  }
});

test('GET /room returns list of rooms', async (t) => {
  const { api } = t.context.app;
  const userCred = await createUserCred();
  const user = await createUserAndAssert(t, api, userCred);
  t.context.createdUsers.push(userCred);

  const game = await createGameAndAssert(t, api, userCred, user);
  await createRoomAndAssert(t, api, userCred, game, user);
  const { data: { rooms }, status } = await api.get(
    '/room', { params: { gameId: game.id } },
  );
  t.is(status, StatusCodes.OK);
  t.assert(rooms.length > 0);
});

test('GET /room supports query by "joinable", "containsPlayer", and "omitPlayer"', async (t) => {
  const { api } = t.context.app;
  const userCredOne = await createUserCred();
  const userCredTwo = await createUserCred();
  const authTokenTwo = await userCredTwo.user.getIdToken();
  const userOne = await createUserAndAssert(t, api, userCredOne);
  const userTwo = await createUserAndAssert(t, api, userCredTwo);
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  const game = await createGameAndAssert(t, api, userCredOne, userOne);
  const room = await createRoomAndAssert(t, api, userCredOne, game, userOne);
  const roomOmitted = await createRoomAndAssert(t, api, userCredOne, game, userOne);
  await api.post(`/room/${roomOmitted.id}/join`, {}, { headers: { authorization: authTokenTwo } });
  const { data: { rooms }, status } = await api.get(
    '/room', {
      params: {
        gameId: game.id, joinable: true, containsPlayer: userOne.id, omitPlayer: userTwo.id,
      },
    },
  );
  t.is(status, StatusCodes.OK);
  t.assert(rooms.length === 1);
  t.assert(rooms[0].id === room.id);
});

test('GET /room supports query by "containsInactivePlayer"', async (t) => {
  const { api } = t.context.app;
  const {
    userCredOne, userTwo, userCredTwo, room, game,
  } = await startTicTacToeRoom(t);
  const authTokenTwo = await userCredTwo.user.getIdToken();
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  // only user two attempts to quit room, but because this triggers a finished room
  // user one also becomes an inactive player
  await api.post(`/room/${room.id}/quit`, {}, { headers: { authorization: authTokenTwo } });

  const { data: { rooms: roomsUserOneQuit }, status: statusUserOne } = await api.get(
    '/room', {
      params: {
        gameId: game.id, containsInactivePlayer: userTwo.id,
      },
    },
  );
  t.is(statusUserOne, StatusCodes.OK);
  t.assert(roomsUserOneQuit.length === 1);
  t.assert(roomsUserOneQuit[0].id === room.id);

  const { data: { rooms: roomsUserTwoQuit }, status: statusUserTwo } = await api.get(
    '/room', {
      params: {
        gameId: game.id, containsInactivePlayer: userTwo.id,
      },
    },
  );
  t.is(statusUserTwo, StatusCodes.OK);
  t.assert(roomsUserTwoQuit.length === 1);
  t.assert(roomsUserTwoQuit[0].id === room.id);
});

test('POST /room creates a room', async (t) => {
  const { api } = t.context.app;
  const userCred = await createUserCred();
  const user = await createUserAndAssert(t, api, userCred);
  t.context.createdUsers.push(userCred);

  const game = await createGameAndAssert(t, api, userCred, user);
  await createRoomAndAssert(t, api, userCred, game, user);
});

test('POST /room returns \'room.game must exist\' if no room', async (t) => {
  const { api } = t.context.app;
  const userCred = await createUserCred();
  await createUserAndAssert(t, api, userCred);
  t.context.createdUsers.push(userCred);

  const authToken = await userCred.user.getIdToken();
  const { response: { status } } = await t.throwsAsync(
    api.post('/room', {
      game: Types.ObjectId(),
    }, { headers: { authorization: authToken } }),
  );
  t.is(status, StatusCodes.BAD_REQUEST);
});

test('POST /room/:id/join joins a game', async (t) => {
  const { api } = t.context.app;
  const { userCredOne, userCredTwo } = await startTicTacToeRoom(t);
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);
});

test('POST /room/:id/join on a non joinable room provides a 400', async (t) => {
  const { room } = await startTicTacToeRoom(t);
  const { api } = t.context.app;
  const userCred = await createUserCred();
  await createUserAndAssert(t, api, userCred);
  t.context.createdUsers.push(userCred);

  const authToken = await userCred.user.getIdToken();

  const { response: { status, data: { message, name } } } = await t.throwsAsync(api.post(`/room/${room.id}/join`, undefined, { headers: { authorization: authToken } }));
  t.is(status, StatusCodes.BAD_REQUEST);
  t.is(name, 'RoomNotJoinable');
  t.is(message, `${room.id} is not joinable!`);
});

test('POST /room/:id/join on a room a player already joined provides a 400', async (t) => {
  const { api } = t.context.app;
  const userCredOne = await createUserCred();
  const userOne = await createUserAndAssert(t, api, userCredOne);
  const game = await createGameAndAssert(t, api, userCredOne, userOne);
  const room = await createRoomAndAssert(t, api, userCredOne, game, userOne);
  const authTokenOne = await userCredOne.user.getIdToken();

  const {
    response: { status, data: { message, name } },
  } = await t.throwsAsync(api.post(
    `/room/${room.id}/join`,
    undefined,
    {
      headers: { authorization: authTokenOne },
    },
  ));
  t.is(status, StatusCodes.BAD_REQUEST);
  t.is(name, 'UserAlreadyInRoom');
  t.is(message, `${userOne.id}: ${userOne.username} is already in room ${room.id}!`);
});

test('POST /room/:id/join on a finished room throws an error', async (t) => {
  await testOperationOnFinishedRoom(t, 'join');
});

test('POST /room/:id/move invokes creator backend to modify the game state', async (t) => {
  const { userCredOne, userCredTwo, room } = await startTicTacToeRoom(t);
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  const { api } = t.context.app;
  const authToken = await userCredOne.user.getIdToken();

  // make move
  const { status } = await api.post(`/room/${room.id}/move`, { x: 0, y: 0 },
    { headers: { authorization: authToken } });
  t.is(status, StatusCodes.OK);
  const {
    data: { room: { latestState: { state: { board } }, joinable, players } },
    status: getStatus,
  } = await api.get(`/room/${room.id}`);
  t.is(getStatus, StatusCodes.OK);
  t.is(joinable, room.joinable);
  t.deepEqual(players, room.players);
  t.deepEqual([
    ['X', null, null],
    [null, null, null],
    [null, null, null]],
  board);
});

test('POST /room/:id/move provides error if user code throws an error', async (t) => {
  const { userCredOne, userCredTwo, room } = await startTicTacToeRoom(t);
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  const { api } = t.context.app;

  // make move with user2 (it's user1's turn!)
  const authToken = await userCredTwo.user.getIdToken();
  const { response: { status } } = await t.throwsAsync(api.post(`/room/${room.id}/move`,
    { x: 0, y: 0 },
    { headers: { authorization: authToken } }));
  t.is(status, StatusCodes.BAD_REQUEST);
});

test('POST /room/:id/move provides error if user tries to make move when not in the room', async (t) => {
  const { api } = t.context.app;
  const userCredOne = await createUserCred();
  const userCredTwo = await createUserCred();
  const userOne = await createUserAndAssert(t, api, userCredOne);
  await createUserAndAssert(t, api, userCredTwo);
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  const authTokenTwo = await userCredTwo.user.getIdToken();
  const game = await createGameAndAssert(t, api, userCredOne, userOne);
  const room = await createRoomAndAssert(t, api, userCredOne, game, userOne);
  const { response: { status } } = await t.throwsAsync(api.post(`/room/${room.id}/move`,
    { x: 0, y: 0 },
    { headers: { authorization: authTokenTwo } }));
  t.is(status, StatusCodes.BAD_REQUEST);
});

test('POST /room/:id/move provides error if database fails', async (t) => {
  // create a separate app
  const customApp = await spawnApp({ forceCreatePersistentDependencies: true });
  createOrUpdateSideApps(t, [customApp]);
  const { api, cleanupMongoDB } = customApp;
  const { userCredOne, userCredTwo, room } = await startTicTacToeRoom({
    ...t,
    context: {
      ...t.context,
      app: customApp,
    },
  });
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  const authToken = await userCredOne.user.getIdToken();

  // forces any db transactions on the customApp to fail because db is no longer running
  await cleanupMongoDB();
  const { response: { status } } = await t.throwsAsync(api.post(`/room/${room.id}/move`,
    { x: 0, y: 0 },
    { headers: { authorization: authToken } }));
  t.is(status, StatusCodes.INTERNAL_SERVER_ERROR);
});

test('POST /room/:id/move on a finished room throws an error', async (t) => {
  await testOperationOnFinishedRoom(t, 'move');
});

test('POST /room/:id/quit user is no longer in the room, and is in inactivePlayers list', async (t) => {
  const {
    userOne, userTwo, userCredOne, userCredTwo, room,
  } = await startTicTacToeRoom(t);
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  const { api } = t.context.app;
  const authToken = await userCredOne.user.getIdToken();

  // quit room
  const { status } = await api.post(`/room/${room.id}/quit`, undefined,
    { headers: { authorization: authToken } });
  t.is(status, StatusCodes.OK);
  const {
    data: {
      room: {
        latestState: { state: { board, winner } }, joinable, players, inactivePlayers, finished,
      },
    },
    status: getStatus,
  } = await api.get(`/room/${room.id}`);
  t.is(getStatus, StatusCodes.OK);
  t.is(joinable, false);
  t.is(finished, true);
  t.deepEqual(winner, getPublicUserFromUser(userTwo));
  t.deepEqual(players, []);
  t.deepEqual(inactivePlayers, [userOne, userTwo].map(getPublicUserFromUser));
  t.deepEqual([
    [null, null, null],
    [null, null, null],
    [null, null, null]],
  board);
});

test('POST /room/:id/quit provides error if user is not in the room', async (t) => {
  const { api } = t.context.app;
  const userCredOne = await createUserCred();
  const userCredTwo = await createUserCred();
  const userOne = await createUserAndAssert(t, api, userCredOne);
  const userTwo = await createUserAndAssert(t, api, userCredTwo);
  t.context.createdUsers.push(userCredOne);
  t.context.createdUsers.push(userCredTwo);

  const authTokenTwo = await userCredTwo.user.getIdToken();
  const game = await createGameAndAssert(t, api, userCredOne, userOne);
  const room = await createRoomAndAssert(t, api, userCredOne, game, userOne);
  const { response: { status, data } } = await t.throwsAsync(api.post(`/room/${room.id}/quit`,
    undefined,
    { headers: { authorization: authTokenTwo } }));
  t.is(status, StatusCodes.BAD_REQUEST);
  t.deepEqual(
    data,
    {
      name: 'UserNotInRoom',
      message: `${userTwo.id}: ${userTwo.username} is not in ${room.id}!`,
    },
  );
});

test('POST /room/:id/quit on a finished room throws an error', async (t) => {
  await testOperationOnFinishedRoom(t, 'quit');
});

test('GET /room/:id returns a room', async (t) => {
  const { api } = t.context.app;
  const userCred = await createUserCred();
  const user = await createUserAndAssert(t, api, userCred);
  t.context.createdUsers.push(userCred);

  const game = await createGameAndAssert(t, api, userCred, user);
  const room = await createRoomAndAssert(t, api, userCred, game, user);
  const { data, status } = await api.get(
    `/room/${room.id}`,
  );
  t.is(status, StatusCodes.OK);
});
