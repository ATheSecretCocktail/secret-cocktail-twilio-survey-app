import 'jest';

import {convertTranscriptionToEmail} from '../src/controller/controller';

describe("test convertTranscriptionToEmail", () => {
    test("it should convert transcribed text to email format", () => {
        expect(convertTranscriptionToEmail('Amy at the secret cocktail dot com.'))
            .toEqual('amy@thesecretcocktail.com');
        expect(convertTranscriptionToEmail('r de e pak 2002 @ gmail.com'))
            .toEqual('rdeepak2002@gmail.com');
        expect(convertTranscriptionToEmail('foo bar at email dot com'))
            .toEqual('foobar@email.com');
        expect(convertTranscriptionToEmail('foo bar at emails dot com.'))
            .toEqual('foobar@emails.com');
        expect(convertTranscriptionToEmail('bar@email.com'))
            .toEqual('bar@email.com');
        expect(convertTranscriptionToEmail(''))
            .toEqual('');
        expect(convertTranscriptionToEmail(undefined as any))
            .toEqual('');
    });
});
