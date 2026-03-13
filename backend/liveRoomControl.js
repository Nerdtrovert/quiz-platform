const handlers = {
  endRoom: null,
  kickParticipant: null,
};

function registerHandlers(nextHandlers) {
  handlers.endRoom = nextHandlers.endRoom || handlers.endRoom;
  handlers.kickParticipant =
    nextHandlers.kickParticipant || handlers.kickParticipant;
}

function getHandlers() {
  return handlers;
}

module.exports = {
  registerHandlers,
  getHandlers,
};
