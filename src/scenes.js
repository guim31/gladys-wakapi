// -----------------------------------------------------------------------------
// Scene action handlers (manifest `scene_actions`, Gladys 5.1+).
//
//   - `read_today`: today's coding time as a sentence, for a message or a
//     voice announcement ("1 h 40 min of coding today (goal 2 h)…"), and the
//     figures as variables for the next actions of the scene.
// -----------------------------------------------------------------------------

export const SCENE_ACTIONS = {
  async read_today(hub) {
    return hub.today();
  },
};
