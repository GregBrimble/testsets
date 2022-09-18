import { glob } from "glob";
import { z } from "zod";
import { join, relative, dirname } from "node:path";
import { readFileSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";

export const test = async () => {
  const GLOBAL_TIMEOUT = 5000;
  const TIMEOUT_CODE = 124;

  const cwd = process.cwd();
  const issuePaths = glob.sync(
    join(cwd, ".testset/issues/*/testset.config.json")
  );

  const issueSchema = z.object({
    test: z.string({ description: "blah" }),
    timeout: z.number().optional(),
  });

  type Issue = z.infer<typeof issueSchema>;

  const issues: { issue: Issue; cwd: string }[] = [];

  for (const issuePath of issuePaths) {
    try {
      let issue = issueSchema.parse(
        JSON.parse(readFileSync(issuePath, "utf-8"))
      );
      issues.push({
        issue,
        cwd: dirname(issuePath),
      });
    } catch (thrown) {
      console.error(
        `Could not read issue: ${relative(cwd, issuePath)}:`,
        thrown.message
      );
      process.exitCode = 1;
    }
  }

  interface Chunk {
    stream: "stdout" | "stderr";
    chunk: string;
  }

  interface Result {
    code: number;
    chunks: Chunk[];
    issue: Issue;
    cwd: string;
  }

  const promises: Promise<Result>[] = [];
  const processes: ChildProcess[] = [];

  // TODO: kill child processes with the same signal we're receiving
  process.on("exit", () => processes.map((process) => process.kill()));
  process.on("SIGINT", () => processes.map((process) => process.kill()));
  process.on("SIGTERM", () => processes.map((process) => process.kill()));

  for (const { issue, cwd } of issues) {
    promises.push(
      new Promise((resolve, reject) => {
        let chunks: Chunk[] = [];

        let timer: NodeJS.Timeout | undefined;

        const childProcess = spawn(issue.test, {
          shell: true,
          cwd,
          env: { CI: "true", ...process.env },
        }).on("exit", (code) => {
          clearTimeout(timer);

          if (code === 0) {
            resolve({ code, chunks, issue, cwd });
          } else {
            reject({ code, chunks, issue, cwd });
            process.exitCode = 1;
          }
        });

        processes.push(childProcess);

        const timeout = issue.timeout ?? GLOBAL_TIMEOUT;
        timer = setTimeout(() => {
          reject({ code: TIMEOUT_CODE, chunks, issue, cwd });
          process.exitCode = 1;
          childProcess.kill();
        }, timeout);

        childProcess.stderr.on("data", (chunk) => {
          const message = chunk.toString();
          chunks.push({ stream: "stderr", chunk: message });
        });
        childProcess.stdout.on("data", (chunk) => {
          const message = chunk.toString();
          chunks.push({ stream: "stdout", chunk: message });
        });
      })
    );
  }

  let successful = 0;
  for (const resolvedPromise of await Promise.allSettled(promises)) {
    if (resolvedPromise.status === "rejected") {
      const result = resolvedPromise.reason as Result;

      console.error(
        `\n\n\nFAIL: ${result.cwd} exited with status code: ${result.code}.\n`
      );

      for (const { stream, chunk } of result.chunks) {
        if (stream === "stderr") {
          console.error(chunk);
        } else {
          console.log(chunk);
        }
      }
    } else {
      successful++;
    }
  }

  console.log(
    `PASS: ${successful} tests out of ${issues.length} passed successfully.`
  );
};
