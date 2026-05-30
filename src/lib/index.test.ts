import { describe, it, expect } from 'vitest';
import { parseUserErrors, parseContactErrors } from './index';

describe('utils/index', () => {
  describe('parseUserErrors', () => {
    it('returns empty object for empty or null input', () => {
      expect(parseUserErrors(null)).toEqual({});
      expect(parseUserErrors([])).toEqual({});
    });

    it('returns original input if not an array', () => {
      expect(parseUserErrors('not an array')).toEqual('not an array');
    });

    it('correctly maps errors based on keywords', () => {
      const errors = [
        "Username is required",
        "Email format is invalid",
        "Password must be at least 8 characters",
        "Role does not exist",
        "Some random general error",
        "Another generic issue"
      ];
      const result = parseUserErrors(errors);
      
      expect(result).toEqual({
        username: "Username is required",
        email: "Email format is invalid",
        password: "Password must be at least 8 characters",
        role: "Role does not exist",
        general: "Some random general error · Another generic issue"
      });
    });

    it('concatenates multiple errors for the email field', () => {
      const errors = [
        "Email format is invalid",
        "Email must be unique"
      ];
      const result = parseUserErrors(errors);
      
      expect(result).toEqual({
        email: "Email format is invalid · Email must be unique"
      });
    });
  });

  describe('parseContactErrors', () => {
    it('handles null or empty input gracefully', () => {
      expect(parseContactErrors(null)).toEqual({});
    });

    it('handles legacy flat array of errors', () => {
      const errors = [
        "Name is required",
        "Email is invalid",
        "Field 'Phone' must be a valid phone number"
      ];
      const extraFields = [{ fieldName: 'Phone', extraFieldDefinitionId: 5 }];
      
      const result = parseContactErrors(errors, extraFields as any);
      
      expect(result).toEqual({
        name: "Name is required",
        email: "Email is invalid",
        "extra-5": "Field 'Phone' must be a valid phone number"
      });
    });

    it('handles new dictionary format of errors', () => {
      const errors = {
        errors: {
          "Name": ["Name is required"],
          "ExtraFields[0]": ["Must be a valid number"]
        }
      };
      const extraFields = [{ extraFieldDefinitionId: 10 }];
      
      const result = parseContactErrors(errors, extraFields as any);
      
      expect(result).toEqual({
        name: "Name is required",
        "extra-10": "Must be a valid number"
      });
    });
  });
});
