"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiddlewareAgent = void 0;
const middleware_agent_1 = __importDefault(require("./agents/middleware-agent"));
exports.MiddlewareAgent = middleware_agent_1.default;
exports.default = middleware_agent_1.default;
