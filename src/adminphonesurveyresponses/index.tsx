import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
// import {
//     collection, doc, getDoc, getDocs, getFirestore, query, where,
// } from 'firebase/firestore';
// import ReactMarkdown from 'react-markdown';
import {
    collection, deleteDoc, doc, getDocs, getFirestore, query, writeBatch,
} from 'firebase/firestore';
import { CSVLink } from 'react-csv';
import { Table, Form } from 'react-bootstrap';
import Navbar from '../navbar';
import styles from './styles.module.css';
import { setupAuthListener } from '../authredirect/setup-auth-listener';
import firebaseApp from '../firebase';
import wave from '../wave.png';
import { checkedIfAllowedOnPage, k_admin_role } from '../authredirect/auth-check';
import { k_admin_facility_page_route, k_admin_phone_survey_page_route } from '../index';
// eslint-disable-next-line max-len
// import { k_admin_facility_page_route, k_facility_report_correction_page_route, k_map_page_route } from '../index';

const Waves = () => (
    <img src={wave} className="wave" alt="Wave for styling webpage." />
);
const AdminPhoneSurveyResponsesPage = () => {
    const auth = getAuth(firebaseApp);
    const navigate = useNavigate();
    const db = getFirestore(firebaseApp);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [phoneSurveyResponses, setPhoneSurveyResponses] = useState<any>([]);
    const [questions, setQuestions] = useState<any>(undefined);
    const [responsesData, setResponsesData] = useState<Array<Array<string>>>([]);
    const selectedResponses = new Set<string>();

    useEffect(() => {
        checkedIfAllowedOnPage(auth, navigate, [k_admin_role]);
        setupAuthListener(auth, navigate, true, false);
    }, [auth, navigate]);

    useEffect(() => {
        if (questions) {
            // fetch phone responses data for CSV
            getDocs(query(collection(db, 'phone-survey-responses')))
                .then((phoneSurveyResponseDocs) => {
                    const phoneSurveyResponsesList: any = [];
                    phoneSurveyResponseDocs.forEach((phoneSurveyResponseDoc) => {
                        const phoneSurveyResponse = phoneSurveyResponseDoc.data();
                        phoneSurveyResponse.id = phoneSurveyResponseDoc.id;
                        const phoneSurveyResponseCleanedUp: any = {};
                        phoneSurveyResponseCleanedUp.phone = phoneSurveyResponse?.toPhoneNumber || 'none';
                        phoneSurveyResponseCleanedUp.callSid = phoneSurveyResponse?.callSid || 'none';
                        // eslint-disable-next-line array-callback-return
                        Object.keys(questions).map((questionID: any) => {
                            let questionText = `${questions[questionID]?.question || ''}`;
                            let response: any = 'Failed to capture response';
                            let recordingURL: any;
                            // eslint-disable-next-line max-len
                            if (phoneSurveyResponse?.questions) {
                                // eslint-disable-next-line no-unsafe-optional-chaining
                                // eslint-disable-next-line max-len
                                const digitResponses: any = phoneSurveyResponse?.questions;
                                digitResponses.forEach((questionResponse: any) => {
                                    // eslint-disable-next-line max-len
                                    if (questionID === questionResponse?.questionDBOID) {
                                        response = questionResponse?.digit || 'Failed to capture key press';
                                        // eslint-disable-next-line max-len
                                        recordingURL = recordingURL || questionResponse?.recordingUrl;
                                    }
                                });
                            }
                            if (phoneSurveyResponse?.questionTranscriptions) {
                                questionText = `${questions[questionID]?.question || ''}`;
                                // eslint-disable-next-line max-len
                                const transcriptionResponses: any = phoneSurveyResponse?.questionTranscriptions;
                                // eslint-disable-next-line max-len
                                transcriptionResponses.forEach((questionResponse: any) => {
                                    // eslint-disable-next-line max-len
                                    if (questionID === questionResponse?.questionDBOID) {
                                        response = questionResponse?.transcriptionText || 'Failed to transcribe audio';
                                        // eslint-disable-next-line max-len
                                        recordingURL = recordingURL || questionResponse?.recordingUrl;
                                    }
                                });
                            }
                            phoneSurveyResponseCleanedUp[questionText] = response || 'No response';
                            phoneSurveyResponseCleanedUp[`${questionText.toString()} (recording)`] = recordingURL || 'No Recording URL';
                        });
                        phoneSurveyResponsesList.push(phoneSurveyResponseCleanedUp);
                    });
                    setResponsesData(phoneSurveyResponsesList);
                })
                .catch((err) => {
                    // eslint-disable-next-line no-console
                    console.error('Error getting questions', err);
                    // eslint-disable-next-line no-alert
                    alert('Error getting questions');
                });
        }
    }, [questions]);

    // @ts-ignore
    useEffect(() => {
        async function fetchPhoneSurveyResponsesAndQuestions() {
            // fetch questions
            const questionsObj: any = {};
            const questionsQuery = await getDocs(query(collection(db, 'question')));
            // eslint-disable-next-line @typescript-eslint/no-shadow
            questionsQuery.forEach((doc) => {
                const question = doc.data();
                question.id = doc.id;
                questionsObj[question.id] = question;
            });
            // @ts-ignore
            setQuestions(questionsObj);

            // fetch phone survey responses
            const phoneSurveyResponsesArr: any = [];
            const phoneSurveyResponsesQuery = await getDocs(query(collection(db, 'phone-survey-responses')));
            // eslint-disable-next-line @typescript-eslint/no-shadow
            phoneSurveyResponsesQuery.forEach((doc) => {
                const phoneSurveyResponse = doc.data();
                phoneSurveyResponse.id = doc.id;
                phoneSurveyResponsesArr.push(phoneSurveyResponse);
            });
            // @ts-ignore
            setPhoneSurveyResponses(phoneSurveyResponsesArr);
        }
        fetchPhoneSurveyResponsesAndQuestions();
    }, [db]);

    return (
        <div className={styles.container}>
            <Navbar />
            <div className={styles.innerContainer}>
                <div className="title">Phone Survey Responses</div>
            </div>
            {
                (responsesData && responsesData.length > 0)
                && (
                    <CSVLink data={responsesData} filename="responses.csv" className={styles.downloadBtn}>
                        <span>Download CSV</span>
                    </CSVLink>
                )
            }
            <Table striped bordered hover responsive="sm">
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Twilio Call SID</th>
                        <th className={styles.longTableColumn}>Phone Number</th>
                        <th className={styles.longTableColumn}>Q1 Answer</th>
                        <th className={styles.longTableColumn}>Q2 Answer</th>
                        <th className={styles.longTableColumn}>Q3 Answer</th>
                        <th className={styles.longTableColumn}>Q4 Answer</th>
                        <th>Create</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                <tbody>
                    {phoneSurveyResponses.map((phoneSurveyResponse: any) => (
                        <tr>
                            <td>
                                <Form.Check
                                    aria-label="checkbox-facility"
                                    type="checkbox"
                                    id={phoneSurveyResponse.id}
                                    onClick={() => {
                                        // eslint-disable-next-line max-len
                                        if (selectedResponses.has(phoneSurveyResponse.id)) selectedResponses.delete(phoneSurveyResponse.id);
                                        else selectedResponses.add(phoneSurveyResponse.id);

                                        // eslint-disable-next-line no-console
                                        console.log(selectedResponses);
                                    }}
                                />
                            </td>
                            <td>
                                {phoneSurveyResponse?.callSid || 'None'}
                            </td>
                            <td>
                                Phone:
                                {' '}
                                {phoneSurveyResponse?.toPhoneNumber || 'None'}
                            </td>
                            {
                                Object.keys(questions).map((questionID: any) => {
                                    let questionText = `${questions[questionID]?.question || ''}`;
                                    let response: any = 'Failed to capture response';
                                    let recordingURL: any;
                                    // eslint-disable-next-line max-len
                                    if (phoneSurveyResponse?.questions) {
                                        // eslint-disable-next-line no-unsafe-optional-chaining
                                        // eslint-disable-next-line max-len
                                        const digitResponses: any = phoneSurveyResponse?.questions;
                                        digitResponses.forEach((questionResponse: any) => {
                                            // eslint-disable-next-line max-len
                                            if (questionID === questionResponse?.questionDBOID) {
                                                response = questionResponse?.digit || 'Failed to capture key press';
                                                // eslint-disable-next-line max-len
                                                recordingURL = recordingURL || questionResponse?.recordingUrl;
                                            }
                                        });
                                    }

                                    if (phoneSurveyResponse?.questionTranscriptions) {
                                        questionText = `${questions[questionID]?.question || ''}`;
                                        // eslint-disable-next-line max-len
                                        const transcriptionResponses: any = phoneSurveyResponse?.questionTranscriptions;
                                        // eslint-disable-next-line max-len
                                        transcriptionResponses.forEach((questionResponse: any) => {
                                            // eslint-disable-next-line max-len
                                            if (questionID === questionResponse?.questionDBOID) {
                                                response = questionResponse?.transcriptionText || 'Failed to transcribe audio';
                                                // eslint-disable-next-line max-len
                                                recordingURL = recordingURL || questionResponse?.recordingUrl;
                                            }
                                        });
                                    }
                                    if (questionText) {
                                        return (
                                            <td>
                                                {/* eslint-disable-next-line max-len */}
                                                <div className={styles.listItemText2}>{questionText}</div>
                                                <div>
                                                    {`${response}`}
                                                </div>
                                                {
                                                    recordingURL
                                                    // eslint-disable-next-line max-len
                                                    // eslint-disable-next-line max-len,jsx-a11y/media-has-caption
                                                    && (
                                                        // eslint-disable-next-line max-len
                                                        // eslint-disable-next-line jsx-a11y/media-has-caption
                                                        <audio controls>
                                                            <source src={recordingURL} type="audio/mpeg" />
                                                        </audio>
                                                    )
                                                }
                                            </td>
                                        );
                                    }
                                    return <div />;
                                })
                            }
                            <td>
                                {/* eslint-disable-next-line max-len */}
                                {(phoneSurveyResponse?.added === undefined || phoneSurveyResponse?.added === false)
                                    && (
                                        <a
                                            target="_blank"
                                            href={`${k_admin_facility_page_route}?phoneSurveyResponseID=${phoneSurveyResponse.id}`}
                                            rel="noreferrer"
                                        >
                                            Create Facility
                                        </a>
                                    )}
                            </td>
                            <td>
                                <button
                                    style={{ border: '#e13d3d', background: '#e13d3d' }}
                                    className={styles.deleteBtnListView}
                                    onClick={() => {
                                        deleteDoc(doc(db, 'phone-survey-responses', phoneSurveyResponse.id || ''))
                                            .then(() => {
                                                window.location.reload();
                                            })
                                            .catch((error: any) => {
                                                // eslint-disable-next-line no-alert
                                                alert('Error deleting phone survey response.');
                                                // eslint-disable-next-line no-console
                                                console.error('Error deleting phone survey response', error);
                                            });
                                    }}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <div className={styles.listItemButtonsContainer}>
                <button
                    className={styles.primaryBtnListView}
                    onClick={(event) => {
                        event.preventDefault();
                        selectedResponses.forEach((responseID) => window.open(`${k_admin_facility_page_route}?phoneSurveyResponseID=${responseID}`, '_blank'));
                    }}
                >
                    Bulk Add
                </button>
                <button
                    style={{ border: '#e13d3d', background: '#e13d3d' }}
                    className={styles.deleteBtnListView}
                    onClick={() => {
                        const batch = writeBatch(db);
                        selectedResponses.forEach((id) => {
                            batch.delete(doc(db, 'phone-survey-responses', id || ''));
                        });
                        batch.commit()
                            .then(() => {
                                window.location.reload();
                            })
                            .catch((error: any) => {
                                // eslint-disable-next-line no-alert
                                alert('Error deleting phone survey response.');
                                // eslint-disable-next-line no-console
                                console.error('Error deleting phone survey response', error);
                            });
                    }}
                >
                    Bulk Delete
                </button>
            </div>
            <div className={styles.innerContainer}>
                {/* TODO: make this a button */}
                {/* eslint-disable-next-line max-len */}
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
                <div
                    className={styles.backBtnContainer}
                    onClick={() => {
                        navigate(k_admin_phone_survey_page_route);
                    }}
                >
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M27 20H13"
                            stroke="#5C5C5C"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M20 27L13 20L20 13"
                            stroke="#5C5C5C"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <div className={styles.backBtnText}>Back</div>
                </div>
            </div>
            <Waves />
        </div>
    );
};

export default AdminPhoneSurveyResponsesPage;
