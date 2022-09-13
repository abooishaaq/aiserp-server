import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";

class Deque {
    items: any[];
    maxlen: number;

    constructor(maxlen: number) {
        this.items = [];
        this.maxlen = maxlen;
        fs.readFile("activity.json", (err, data) => {
            if (err) {
                console.log(err);
            } else {
                this.items = JSON.parse(data.toString());
                this.items = this.items
                    .filter((x) => x)
                    .map((item) => {
                        item.id = uuidv4();
                    });
            }
        });
    }

    push(item: any) {
        console.log("pushing", item);
        item.id = uuidv4();
        this.items.push(item);
        if (this.items.length > this.maxlen) {
            this.items = this.items.slice(1);
        }
        fs.writeFileSync("activity.json", JSON.stringify(this.items));
    }
}

export default new Deque(100);
