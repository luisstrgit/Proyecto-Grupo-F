const fizzBuzz = require('../fizzbuzz');

describe('Kata TDD de nuestro equipo', () => {
    test('Debe retornar "Fizz" para múltiplo de 3', () => {
        expect(fizzBuzz(3)).toBe("Fizz");
    });
    test('Debe retornar "Buzz" para múltiplo de 5', () => {
        expect(fizzBuzz(5)).toBe("Buzz");
    });
    test('Debe retornar "FizzBuzz" para múltiplo de 3 y 5', () => {
        expect(fizzBuzz(15)).toBe("FizzBuzz");
    });
});