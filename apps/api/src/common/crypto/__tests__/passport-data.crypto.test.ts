import { encryptPassportData, decryptPassportData } from '../passport-data.crypto'

// 32-byte key as 64-char hex
const VALID_KEY = 'a'.repeat(64)
const OTHER_KEY = 'b'.repeat(64)

const SAMPLE_DATA = { series: '1234', number: '567890', issuedBy: 'МВД России' }

describe('passport-data.crypto', () => {
  describe('encryptPassportData / decryptPassportData', () => {
    it('round-trips and returns the original data', () => {
      const encrypted = encryptPassportData(SAMPLE_DATA, VALID_KEY)
      const decrypted = decryptPassportData(encrypted, VALID_KEY)
      expect(decrypted).toEqual(SAMPLE_DATA)
    })

    it('produces different ciphertext on each call (random IV)', () => {
      const enc1 = encryptPassportData(SAMPLE_DATA, VALID_KEY)
      const enc2 = encryptPassportData(SAMPLE_DATA, VALID_KEY)
      expect(enc1).not.toBe(enc2)
    })

    it('throws on decryption with wrong key', () => {
      const encrypted = encryptPassportData(SAMPLE_DATA, VALID_KEY)
      expect(() => decryptPassportData(encrypted, OTHER_KEY)).toThrow()
    })

    it('throws on tampered authTag', () => {
      const encrypted = encryptPassportData(SAMPLE_DATA, VALID_KEY)
      const parts = encrypted.split(':')
      // Flip a byte in the authTag (middle segment)
      const tamperedTag = parts[1].slice(0, -2) + (parts[1].slice(-2) === 'ff' ? '00' : 'ff')
      const tampered = [parts[0], tamperedTag, parts[2]].join(':')
      expect(() => decryptPassportData(tampered, VALID_KEY)).toThrow()
    })

    it('throws when key length is wrong', () => {
      expect(() => encryptPassportData(SAMPLE_DATA, 'short')).toThrow(/PASSPORT_DATA_KEY/)
    })

    it('throws on invalid encrypted format (missing segments)', () => {
      expect(() => decryptPassportData('notvalid', VALID_KEY)).toThrow('Invalid encrypted passport data format')
    })
  })
})
