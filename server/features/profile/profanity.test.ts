import { describe, expect, it } from 'vitest';
import { containsProfanity } from './profanity.js';

describe('containsProfanity', () => {
  it('flags obvious profanity', () => {
    expect(containsProfanity('fuckface')).toBe(true);
    expect(containsProfanity('shitlord')).toBe(true);
  });

  it('flags common leetspeak substitutions', () => {
    expect(containsProfanity('sh1t')).toBe(true);
    expect(containsProfanity('fuk')).toBe(true);
  });

  it('flags camelcase compounds whose patterns require word boundaries', () => {
    expect(containsProfanity('BadAss')).toBe(true);
    expect(containsProfanity('BigCock')).toBe(true);
    expect(containsProfanity('NiceAss')).toBe(true);
    expect(containsProfanity('BigTits')).toBe(true);
    expect(containsProfanity('IamFag')).toBe(true);
  });

  it('flags custom-list words missing from upstream', () => {
    expect(containsProfanity('balls')).toBe(true);
    expect(containsProfanity('BigBalls')).toBe(true);
    expect(containsProfanity('big balls')).toBe(true);
    expect(containsProfanity('nuts')).toBe(true);
    expect(containsProfanity('DeezNuts')).toBe(true);
    expect(containsProfanity('boner')).toBe(true);
    expect(containsProfanity('BigBoner')).toBe(true);
  });

  it('does not flag innocuous compounds containing custom-list stems', () => {
    expect(containsProfanity('Walnuts')).toBe(false);
    expect(containsProfanity('Peanuts')).toBe(false);
    expect(containsProfanity('Nutshell')).toBe(false);
    expect(containsProfanity('Snowballs')).toBe(false);
    expect(containsProfanity('Football')).toBe(false);
    expect(containsProfanity('Basketball')).toBe(false);
  });

  it('flags letter-by-letter obfuscations', () => {
    expect(containsProfanity('D I C K')).toBe(true);
    expect(containsProfanity('d i c k')).toBe(true);
    expect(containsProfanity('D.I.C.K')).toBe(true);
    expect(containsProfanity('D-I-C-K')).toBe(true);
    expect(containsProfanity('D_I_C_K')).toBe(true);
    expect(containsProfanity('F U C K')).toBe(true);
    expect(containsProfanity('B I G   D I C K R R')).toBe(true);
  });

  it('does not flag legitimate names with initials', () => {
    expect(containsProfanity('J K Rowling')).toBe(false);
    expect(containsProfanity('J. R. R. Tolkien')).toBe(false);
    expect(containsProfanity('A B Smith')).toBe(false);
    expect(containsProfanity('U.S. Army')).toBe(false);
    expect(containsProfanity('J.D. Power')).toBe(false);
  });

  it('passes innocuous names', () => {
    expect(containsProfanity('Anonymous')).toBe(false);
    expect(containsProfanity('Cheerful Tadpole')).toBe(false);
    expect(containsProfanity('eaydede')).toBe(false);
    expect(containsProfanity('player123')).toBe(false);
    expect(containsProfanity('Cassandra')).toBe(false);
    expect(containsProfanity('ClassAct')).toBe(false);
    expect(containsProfanity('Scunthorpe')).toBe(false);
  });

  it('handles edge inputs without throwing', () => {
    expect(containsProfanity('')).toBe(false);
    expect(containsProfanity('   ')).toBe(false);
  });
});
