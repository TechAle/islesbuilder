import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { SliderControl } from '../../js/renderers/controls.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

function slider(id) {
    return document.getElementById(id);
}

describe('damage settings sliders', () => {
    it('has the correct Grief uptime range', () => {
        expect(slider('grief-uptime').min).toBe('1');
        expect(slider('grief-uptime').max).toBe('100');
        expect(slider('grief-uptime').value).toBe('100');
    });

    it('has the correct Last Sorrow uptime range', () => {
        expect(slider('last-sorrow-uptime').min).toBe('1');
        expect(slider('last-sorrow-uptime').max).toBe('100');
        expect(slider('last-sorrow-uptime').value).toBe('100');
    });

    it('has the correct Focus range', () => {
        expect(slider('focus-stacks').min).toBe('0');
        expect(slider('focus-stacks').max).toBe('3');
        expect(slider('focus-stacks').step).toBe('0.1');
    });

    it('has the correct Sharpshooter resets range', () => {
        expect(slider('sharpshooter-resets').min).toBe('0');
        expect(slider('sharpshooter-resets').max).toBe('2');
        expect(slider('sharpshooter-resets').step).toBe('0.1');
        expect(slider('sharpshooter-resets').value).toBe('0');
    });

    it('has the correct Potential Charge range', () => {
        expect(slider('potential-charge-kills').min).toBe('0');
        expect(slider('potential-charge-kills').max).toBe('30');
        expect(slider('potential-charge-kills').step).toBe('1');
    });

    it('has the correct Second Wind kills per second range', () => {
        expect(slider('ultimate-kills').min).toBe('0');
        expect(slider('ultimate-kills').max).toBe('4');
        expect(slider('ultimate-kills').step).toBe('0.1');
        expect(slider('ultimate-kills').value).toBe('0.2');
    });

    it('has the correct crystal explosion range', () => {
        expect(slider('crystal-explosions').min).toBe('0');
        expect(slider('crystal-explosions').max).toBe('4');
        expect(slider('crystal-explosions').step).toBe('0.1');
    });

    it('has HP sliders from 0 to 100', () => {
        for (const id of ['execution-hp', 'prosecution-hp', 'enraged-hp']) {
            expect(slider(id).min, id).toBe('0');
            expect(slider(id).max, id).toBe('100');
            expect(slider(id).step, id).toBe('1');
            expect(slider(id).value, id).toBe('50');
        }
    });

    it('has Infected hits capped at 15', () => {
        expect(slider('infected-hits').min).toBe('0');
        expect(slider('infected-hits').max).toBe('15');
        expect(slider('infected-hits').step).toBe('1');
        expect(slider('infected-hits').value).toBe('0');
    });

    it('has Deathburst kills per second capped at 0.2', () => {
        expect(slider('deathburst-kills').min).toBe('0');
        expect(slider('deathburst-kills').max).toBe('0.2');
        expect(slider('deathburst-kills').step).toBe('0.01');
        expect(slider('deathburst-kills').value).toBe('0.2');
    });
});

describe('SliderControl', () => {
    it('clamps the value when the maximum is lowered', () => {
        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = '10';
        input.value = '8';
        const valueEl = document.createElement('span');
        const control = new SliderControl({ input, valueEl, onChange: () => {} });

        control.setMax(5);

        expect(input.max).toBe('5');
        expect(input.value).toBe('5');
        expect(valueEl.textContent).toBe('5 / 5');
    });

    it('reads values as numbers', () => {
        const input = document.createElement('input');
        input.type = 'range';
        input.value = '3.5';
        const control = new SliderControl({ input, valueEl: null, onChange: () => {} });

        expect(control.value).toBe(3.5);
    });
});
