import { test } from "./test";
import { issue } from "./issue";

const command = process.argv[2];

switch (command) {
  case "test": {
    test();
    break;
  }
  case "issue": {
    issue(process.argv[3]);
    break;
  }
}
