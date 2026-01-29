/**
 * CallKeep Service Exports
 *
 * Native call UI integration for iOS (CallKit) and Android (ConnectionService)
 */

export { callKeepService, default } from './CallKeepService';
export type {
  CallKeepCall,
  CallKeepOptions,
  IncomingCallData,
  AnswerCallHandler,
  EndCallHandler,
  MuteCallHandler,
} from './CallKeepService';
