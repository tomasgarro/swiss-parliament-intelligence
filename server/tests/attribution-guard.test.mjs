import test from 'node:test';import assert from 'node:assert/strict';import {unsupportedProposalAttribution,unsupportedFederalCouncilAttribution as councilSlip} from '../attribution-guard.mjs';
import {speakerRole,roleGender,federalCouncilRole} from '../roles.mjs';
test('reported motion is not the reporting speaker’s proposal',()=>{
 assert.equal(unsupportedProposalAttribution('Giorgio Fonio proposed a motion to protect SMEs.','La mozione Stark pone l’obiettivo di tutelare le PMI.'),true);
 assert.equal(unsupportedProposalAttribution('Giorgio Fonio describes the Stark motion.','La mozione Stark pone l’obiettivo di tutelare le PMI.'),false);
 assert.equal(unsupportedProposalAttribution('The speaker proposed a motion.','Propongo una mozione per le PMI.'),false);
});
test('only a Federal Council member’s speech can carry what the Federal Council says',()=>{
 for(const claim of ['Buffat Michaël: The Federal Council rejects the initiative.','Le Conseil fédéral rejette l’initiative.','Der Bundesrat lehnt die Initiative ab.','Il Consiglio federale respinge l’iniziativa.','Buffat Michaël: According to the Federal Council, the initiative goes too far.'])assert.equal(councilSlip(claim,'Mit-M'),true,claim);
 assert.equal(councilSlip('Keller-Sutter Karin: The Federal Council rejects the initiative.','BR-F'),false,'a Federal Councillor speaks for it');
 assert.equal(councilSlip('Buffat Michaël says the Federal Council rejects the initiative.','Mit-M'),false,'reported, not the subject');
 assert.equal(councilSlip('Buffat Michaël: The Federal Council rejects the initiative, he recalls.','Mit-M'),false,'explicitly reported');
 assert.equal(councilSlip('Buffat Michaël: The Federal Council’s counter-proposal caps immigration.','Mit-M'),false);
 assert.equal(councilSlip('Buffat Michaël: Federal Councillor Keller-Sutter was absent.','Mit-M'),false);
});
test('Bulletin role codes decode for every stage, with the recorded gender',()=>{
 assert.equal(speakerRole('Mit-F','Conseil national'),'National Councillor');assert.equal(speakerRole('Mit-M','NR'),'National Councillor');assert.equal(speakerRole('Mit-M','Ständerat'),'Member of the Council of States');
 assert.equal(speakerRole('BR-M'),'Federal Councillor');assert.equal(speakerRole('BPR-F'),'President of the Swiss Confederation');assert.equal(speakerRole('Rapporteur'),'Rapporteur');assert.equal(speakerRole(undefined),null);
 assert.equal(roleGender('Mit-F'),'f');assert.equal(roleGender('BR-M'),'m');assert.equal(roleGender('BK'),null);
 assert.deepEqual(['BR-F','BPR-M','VPBR-M','BK-M','Mit-M'].map(federalCouncilRole),[true,true,true,false,false]);
});
