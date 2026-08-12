import { MockTokkoProvider } from "./tokko/mock";
import { TokkoProvider } from "./tokko/provider";
import { MockWordPressProvider } from "./wordpress/mock";
import { WordPressProvider } from "./wordpress/provider";
import { MockEmailProvider } from "./resend/mock";
import { ResendEmailProvider } from "./resend/provider";
const mock = () => process.env.INTEGRATIONS_MODE !== "live";
export const getPropertyProvider = () =>
  mock() ? new MockTokkoProvider() : new TokkoProvider();
export const getBlogProvider = () =>
  mock() ? new MockWordPressProvider() : new WordPressProvider();
export const getEmailProvider = () =>
  mock() ? new MockEmailProvider() : new ResendEmailProvider();
