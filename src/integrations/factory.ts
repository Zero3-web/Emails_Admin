import { TokkoProvider } from "./tokko/provider";
import { WordPressProvider } from "./wordpress/provider";
import { ResendEmailProvider } from "./resend/provider";

export const getPropertyProvider = () => new TokkoProvider();
export const getBlogProvider = () => new WordPressProvider();
export const getEmailProvider = () => new ResendEmailProvider();
