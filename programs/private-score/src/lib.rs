use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HzsCUMh56mYkrR4WyuyYnrHE7rrLPEsAhSZA8nFQ6KYz");

#[program]
pub mod privatescore {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }
}
