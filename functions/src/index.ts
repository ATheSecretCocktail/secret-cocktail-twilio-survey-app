import * as functions from "firebase-functions";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import addRoutes from "./routes/routes";
import {sendPhoneSurvey} from "./queue/queue";
import {createAccountAndSendEmail, deleteAccount} from "./facility-account/facility-account";

// setup express server for case where REST API is needed
const app = express();
// @ts-ignore
app.use(bodyParser.urlencoded({ extended: false }));
const allowedOrigins = ['http://localhost:3000',
    'https://secret-cocktail.web.app',
    '*',
    'https://tsc-phone-survey.web.app'];
app.use(cors({
    origin: function(origin, callback){
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }

}));
addRoutes(app);
exports.app = functions.https.onRequest(app);

exports.scheduleCallFunction = functions.firestore
    .document('to-contact-for-survey/{docId}')
    .onCreate((doc, context) => {
        const phoneNumberToContact: string = doc?.data()?.phone || '';
        const record: boolean = doc?.data()?.record || false;
        const docId: string = doc?.id || '';
        if (phoneNumberToContact) {
            void sendPhoneSurvey(docId, phoneNumberToContact, record).then(() => {
                console.log("Sent phone survey");
            });
        }
    });

exports.createFacilityAccount = functions.firestore
    .document('facility/{docId}')
    .onCreate((doc, context) => {
        const name: string = doc?.data()?.name || 'Facility';
        const email: string = doc?.data()?.email;
        const id = doc?.id || "id";
        createAccountAndSendEmail(email, name, id);
    });

exports.deleteFacilityAccount = functions.firestore
    .document('facility/{docId}')
    .onDelete((doc, context) => {
        const facilityEmail: string = doc?.data()?.email;
        deleteAccount(facilityEmail);
    });
