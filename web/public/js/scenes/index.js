// Every scene is a prebuilt full-screen UI. mount(el, data, agent) fills it from data
// and returns { onAction(action) } for steps the user speaks while it is open.
import payment from './payment.js';

export const SCENES = { payment };
