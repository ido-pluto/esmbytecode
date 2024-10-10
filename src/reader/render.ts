import { build_stream, find_end_of_def_skip_block, end_of_block } from './index.cjs';


export interface SplitText {
    text: string,
    type_name: string,
    is_skip: boolean;
}


export function parseTextStream(text: string): SplitText[] {
    return JSON.parse(build_stream(text));
}

export function endOfDefSkipBlock(text: string, types: string[]): number {
    return find_end_of_def_skip_block(text, JSON.stringify(types));
}

export function endOfBlock(text: string, types: string[]): number {
    return end_of_block(text, JSON.stringify(types));
}

abstract class BaseEntityCode {
    ReplaceAll(text: string, find: string, replace: string) {
        let newText = "";
        for (const i of text.split(find)) {
            newText += replace + i;
        }

        return newText.substring(replace.length);
    }
}


abstract class ReBuildCodeBasic extends BaseEntityCode {
    public parseArray: SplitText[];

    constructor(parseArray: SplitText[]) {
        super();
        this.parseArray = parseArray;
    }

    buildCode() {
        let outString = "";

        for (const i of this.parseArray) {
            outString += i.text;
        }

        return this.ReplaceAll(outString, '<|-|>', '<||>');
    }
}


type DataCodeInfo = {
    text: string,
    inputs: string[];
};

export class ReBuildCodeString extends ReBuildCodeBasic {
    private dataCode: DataCodeInfo;

    constructor(parseArray: SplitText[]) {
        super(parseArray);
        this.dataCode = { text: "", inputs: [] };
        this.createDataCode();
    }

    get codeBuildText() {
        return this.dataCode.text;
    }

    set codeBuildText(value) {
        this.dataCode.text = value;
    }

    get allInputs() {
        return this.dataCode.inputs;
    }

    private createDataCode() {
        for (const i of this.parseArray) {
            if (i.is_skip) {
                this.dataCode.text += `<|${this.dataCode.inputs.length}|${i.type_name ?? ''}|>`;
                this.dataCode.inputs.push(i.text);
            } else {
                this.dataCode.text += i.text;
            }
        }
    }

    /**
     * if the <||> start with a (+.) like that for example, "+.<||>", the update function will get the last "SkipText" instead getting the new one
     * same with a (-.) just for ignoring current value
     * @returns the builded code
     */
    override buildCode() {
        const newString = this.dataCode.text.replace(/<\|([0-9]+)\|[\w]*\|>/gi, (_, g1) => {
            return this.dataCode.inputs[g1];
        });

        return super.ReplaceAll(newString, '<|-|>', '<||>');
    }
}
