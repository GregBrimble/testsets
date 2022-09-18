import { glob } from "glob";
import { join, dirname } from "node:path";
import { readFileSync, rmSync } from "node:fs";
import { copySync } from "fs-extra";
import prompts from "prompts";
import { z } from "zod";
import { spawn } from "node:child_process";

const issueNameRegex = /^(\d+)(.*)?$/;

export const issue = async (name: string) => {
  const match = issueNameRegex.exec(name);
  if (!match) {
    throw new Error(
      "Invalid issue name (it must start with the issue number)."
    );
  }
  const issueNumber = parseInt(match[1]);
  if (isNaN(issueNumber) || issueNumber < 1) {
    throw new Error("Invalid issue number.");
  }

  const cwd = process.cwd();

  const templatePaths = glob.sync(
    join(cwd, "./.testset/templates/*/testset.template.json")
  );

  const templateSchema = z.object({
    name: z.string(),
  });

  type Template = z.infer<typeof templateSchema>;

  const templates: { template: Template; cwd: string }[] = [];

  for (const templatePath of templatePaths) {
    try {
      templates.push({
        template: templateSchema.parse(
          JSON.parse(readFileSync(templatePath, "utf-8"))
        ),
        cwd: dirname(templatePath),
      });
    } catch {}
  }

  let template = templates[0].cwd;

  if (templates.length > 1) {
    template = (
      await prompts({
        type: "select",
        message: "Pick a template",
        name: "template",
        choices: templates.map((template) => ({
          title: template.template.name,
          value: template.cwd,
        })),
      })
    ).template;
  }

  const destination = join(cwd, `./.testset/issues/${name}`);
  copySync(template, destination);
  rmSync(join(destination, "testset.config.json"));

  // TODO: Figure out other package managers (e.g. yarn/pnpm)
  const shouldInstall = (
    await prompts({
      name: "install",
      message: "Do you want to run 'npm install' now?",
      type: "toggle",
      active: "yes",
      inactive: "no",
    })
  ).install;

  if (shouldInstall) {
    spawn("npm", ["install"], { shell: true, stdio: "inherit" });
  }
};
