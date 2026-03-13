const rooms = {};

function createRoom(room_code, roomData) {
  rooms[room_code] = roomData;
  return rooms[room_code];
}

function getRoom(room_code) {
  return rooms[room_code];
}

function removeRoom(room_code) {
  delete rooms[room_code];
}

function listRooms() {
  return Object.entries(rooms).map(([room_code, room]) => ({
    room_code,
    ...room,
  }));
}

function findParticipant(room_code, participant_id) {
  const room = rooms[room_code];
  if (!room) return null;

  const entry = Object.entries(room.participants || {}).find(
    ([, participant]) => participant.participant_id === participant_id,
  );
  if (!entry) return null;

  const [socketId, participant] = entry;
  return { socketId, participant, room };
}

module.exports = {
  createRoom,
  getRoom,
  removeRoom,
  listRooms,
  findParticipant,
};
