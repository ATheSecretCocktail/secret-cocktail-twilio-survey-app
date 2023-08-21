import {db} from "../config/firebase-config";
import * as VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import {transcriptionURL, voiceURL} from "../config/twilio-config";
import {firestore} from "firebase-admin";
import FieldValue = firestore.FieldValue;
import { debug } from "firebase-functions/logger";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const phoneSurveyEvent = async (req: any, res: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const callStatus: string = (req?.body?.CallStatus || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const callSID: string = (req?.body?.CallSid || '').toString();
    const phoneSurveyRef = db.collection("to-contact-for-survey");
    // console.log("Got event from phone survey call for call with SID ", callSID);
    const snapshot = await phoneSurveyRef.where('callSID', '==', callSID).get();
    if (snapshot.empty) {
        console.error('Could not update status of call with SID', callSID);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        res.send("Done");
        return;
    } else {
        snapshot.forEach(doc => {
            db.collection("to-contact-for-survey")
                .doc(doc.id)
                .set({callStatus: callStatus}, {merge: true})
                .then(() => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    res.send("Done");
                })
                .catch((e) => {
                    console.error('Error updating status of call in database with ID ', doc.id);
                    console.error(e);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    res.send("Done");
                });
        });
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const phoneSurveyFailureEvent = async (req: any, res: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const twiml = new VoiceResponse();
    twiml.say("A fatal error has occurred, please contact support");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.error("Fatal error endpoint hit", JSON.stringify(req?.body || {}));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const callSID: string = (req?.body?.CallSid || '').toString();
    const phoneSurveyRef = db.collection("to-contact-for-survey");
    // console.log("Got event from phone survey call for call with SID ", callSID);
    const snapshot = await phoneSurveyRef.where('callSID', '==', callSID).get();
    if (snapshot.empty) {
        console.error('Could not update fallback status of call with SID', callSID);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        res.type('text/xml');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        res.send(twiml.toString());
        return;
    } else {
        snapshot.forEach(doc => {
            db.collection("to-contact-for-survey")
                .doc(doc.id)
                .set({callStatus: 'failure'}, {merge: true})
                .then(() => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    res.type('text/xml');
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    res.send(twiml.toString());
                })
                .catch((e) => {
                    console.error('Error updating status of call in database with ID ', doc.id);
                    console.error(e);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    res.type('text/xml');
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    res.send(twiml.toString());
                });
        });
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const phoneSurveyQuestionResponseEvent = async (req: any, res: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const questionNumber: number = parseInt((req?.query?.questionNumber || '0').toString());
    const nextQuestionNumber: number = parseInt(questionNumber.toString()) + 1;
    const twiml = new VoiceResponse();

    // get the question from our database
    const questionRef = db.collection("question");
    let questionDBOID = '';
    let questionDBO: any = undefined;
    // console.log("Got event from phone survey call for call with SID ", callSID);
    const snapshot = await questionRef.where('order', '==', questionNumber).get();
    if (!snapshot.empty) {
        snapshot.forEach(doc => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            questionDBOID = doc?.id || '';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            questionDBO = doc?.data();
        });
    }

    // if no question database object can be found, then we have reached the end of the survey
    if (!questionDBO) {
        twiml.say("Thank you for taking this survey!");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        res.type('text/xml');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        res.send(twiml.toString());
        return;
    }

    // extract variables from question database object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const question: string = questionDBO?.question || 'Error getting question';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const type: string = questionDBO?.type || 'keypad';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const digitResponseMin: number = parseInt(questionDBO?.digitResponseMin || '1');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const digitResponseMax: number = parseInt(questionDBO?.digitResponseMax || '1');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const voiceRecordingTimeout: number = parseInt(questionDBO?.voiceRecordingTimeout || '10');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const transcribe: boolean = questionDBO?.transcribe || false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const transcribeAsEmail: boolean = questionDBO?.transcribeAsEmail || false;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const numDigitsToGather: number = parseInt(questionDBO?.numDigits || '1');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const digitsTimeout: number = parseInt(questionDBO?.digitsTimeout || '8');

    // ask question to the user and attempt to receive their input
    const gatherResponse = () => {
        if (type == 'voice') {
            twiml.say(`${question}`);
            // more options here (like transcribe callback): https://www.twilio.com/docs/voice/twiml/record
            twiml.record({
                timeout: voiceRecordingTimeout,
                transcribe: transcribe,
                transcribeCallback: `${transcriptionURL}?questionNumber=${questionNumber}&transcribeAsEmail=${transcribeAsEmail}`,
                playBeep: true,
            });
        } else {
            twiml.gather({ numDigits: numDigitsToGather, timeout: digitsTimeout }).say(`${question}`);
        }
        // gatherNode.say(`This is question ${parseInt(questionNumber.toString()) + 1}. Please press 1 or 2.`);
        twiml.redirect({method: 'POST'}, `${voiceURL}?questionNumber=${questionNumber}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (type === 'keypad' && req?.body?.Digits) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const callSid = (req?.body?.CallSid || 'unknown').toString();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const toPhoneNumber = (req?.body?.To || 'unknown').toString();
        // case where user inputs a number
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const digit = parseInt(req?.body?.Digits || '0');
        if (digit >= digitResponseMin && digit <= digitResponseMax) {
            const numStr = (digit || 0).toString();
            let numWord = '';
            for (let i = 0; i < numStr.length; i++) {
                numWord += numStr[i] + ' ';
            }
            twiml.say(`You have pressed ${numWord}`);
            twiml.redirect({method: 'POST'}, `${voiceURL}?questionNumber=${nextQuestionNumber}`);
            // console.log('digit pressed is ', digit);
            // question with digit to database
            // save question with recording URL and SID to database
            const questionData = {
                digit: digit,
                questionDBOID: questionDBOID
            };
            db.collection("phone-survey-responses")
                .doc(callSid)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                .set({callSid: callSid, toPhoneNumber: toPhoneNumber, questions: FieldValue.arrayUnion(questionData)}, {merge: true})
                .catch((e) => {
                    console.error('Error saving response for digit question to database');
                    console.error(e);
                });
        } else {
            twiml.say("Sorry, I don't understand that choice");
            twiml.pause();
            gatherResponse();
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } else if (type === 'voice' && req?.body?.RecordingUrl) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const callSid = (req?.body?.CallSid || 'unknown').toString();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const toPhoneNumber = (req?.body?.To || 'unknown').toString();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
        const recordingUrl = `${req?.body?.RecordingUrl}.mp3`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
        const recordingSid = `${req?.body?.RecordingSid || ''}`;
        twiml.say("Thank you for recording your response for that question.");
        twiml.redirect({method: 'POST'}, `${voiceURL}?questionNumber=${nextQuestionNumber}`);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        // save question with recording URL and SID to database
        const questionData = {
            recordingUrl: recordingUrl,
            recordingSid: recordingSid,
            questionDBOID: questionDBOID
        };
        db.collection("phone-survey-responses")
            .doc(callSid)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            .set({callSid: callSid, toPhoneNumber: toPhoneNumber, questions: FieldValue.arrayUnion(questionData)}, {merge: true})
            .catch((e) => {
                console.error('Error saving response for voice question to database');
                console.error(e);
            });
    } else {
        gatherResponse();
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.type('text/xml');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.send(twiml.toString());
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/require-await
export const phoneSurveyRecordingEvent = async (req: any, res: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const callSID: string = (req?.body?.CallSid || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const recordingSID: string = (req?.body?.RecordingSid || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const recordingUrl: string = (req?.body?.RecordingUrl || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const recordingStatus: string = (req?.body?.RecordingStatus || '').toString();

    db.collection("phone-survey-responses")
        .doc(callSID)
        .set({callSid: callSID, recordingSid: recordingSID, recordingUrl: recordingUrl, recordingStatus: recordingStatus}, {merge: true})
        .then(() => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            res.send("Done");
        })
        .catch((e) => {
            console.error('Error updating recording URL of call');
            console.error(e);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            res.send("Done");
        });
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/require-await
export const phoneSurveyTranscriptionEvent = async (req: any, res: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const questionNumber: number = parseInt((req?.query?.questionNumber || '0').toString());

    // get the question from our database
    const questionRef = db.collection("question");
    let questionDBOID = '';
    // let questionDBO: any = undefined;
    // console.log("Got event from phone survey call for call with SID ", callSID);
    const snapshot = await questionRef.where('order', '==', questionNumber).get();
    let transcribeAsEmail = req?.query?.transcribeAsEmail.toString() === 'true';

    console.log("(transcription step) transcribeAsEmail", transcribeAsEmail);
    debug(`(transcription step) Transcribe as email is ${transcribeAsEmail} for question number ${questionNumber}`);

    if (!snapshot.empty) {
        snapshot.forEach(doc => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            questionDBOID = doc?.id || '';
            // transcribeAsEmail = doc?.data()?.transcribeAsEmail || false;
            // debug(`Transcribe as email is ${transcribeAsEmail} for question ${questionDBOID}`);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            // questionDBO = doc?.data();
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const callSid: string = (req?.body?.CallSid || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    let transcriptionText: string = (req?.body?.TranscriptionText || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const transcriptionStatus: string = (req?.body?.TranscriptionStatus || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const transcriptionUrl: string = (req?.body?.TranscriptionUrl || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const transcriptionSid: string = (req?.body?.TranscriptionSid || '').toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const transcriptionType: string = (req?.body?.TranscriptionType || '').toString();

    if (transcribeAsEmail) {
        transcriptionText = convertTranscriptionToEmail(transcriptionText);
    }

    // transcriptionText = "foo";

    const questionTranscriptionData = {
        transcriptionText: transcriptionText,
        transcriptionStatus: transcriptionStatus,
        transcriptionUrl: transcriptionUrl,
        transcriptionSid: transcriptionSid,
        transcriptionType: transcriptionType,
        questionDBOID: questionDBOID
    };

    db.collection("phone-survey-responses")
        .doc(callSid)
        .set({callSid: callSid, questionTranscriptions: FieldValue.arrayUnion(questionTranscriptionData)}, {merge: true})
        .then(() => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            res.send("Done");
        })
        .catch((e) => {
            console.error('Error updating recording URL of call');
            console.error(e);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            res.send("Done");
        });
}

// @ts-ignore
String.prototype.replaceLast = function (what, replacement) {
    const pcs = this.split(what);
    if (pcs.length == 1) {
        return this;
    }
    const lastPc = pcs.pop();
    return pcs.join(what) + replacement + lastPc;
};

export const convertTranscriptionToEmail = (text: string): string => {
    // replace 'at' with '@'
    let split_text = text?.split(' ') || [];
    let result = "";
    let atFlag = false;
    for (let i = 0; i < split_text.length; i++) {
        if (split_text[i] === 'at' && !atFlag) {
            result += '@';
            atFlag = true;
        } else {
            result += split_text[i];
        }
    }

    // remove all spaces
    result = result.replace(/\s+/g, '');

    // make lowercase
    result = result.toLowerCase();

    // replace last instance of dotcom with .com
    // @ts-ignore
    result = result.replaceLast("dotcom", ".com");

    // if string ends in period, remove that
    if (result.length > 0 && result.charAt(result.length - 1) === '.') {
        result = result.substring(0, result.length - 1);
    }

    return result;
}

