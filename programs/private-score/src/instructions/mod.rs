//! Instructions module - All program instructions for PrivateScore

pub mod borrow_standard;
pub mod deposit;
pub mod grant_viewing_access;
pub mod initialize_pool;
pub mod liquidate;
pub mod register_credit;
pub mod repay;
pub mod revoke_viewing_access;
pub mod update_credit;
pub mod verify_and_borrow;
pub mod withdraw;

pub use borrow_standard::*;
pub use deposit::*;
pub use grant_viewing_access::*;
pub use initialize_pool::*;
pub use liquidate::*;
pub use register_credit::*;
pub use repay::*;
pub use revoke_viewing_access::*;
pub use update_credit::*;
pub use verify_and_borrow::*;
pub use withdraw::*;