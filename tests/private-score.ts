import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { PrivateScore } from "../target/types/private_score";

describe("private-score", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.privateScore as Program<PrivateScore>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
