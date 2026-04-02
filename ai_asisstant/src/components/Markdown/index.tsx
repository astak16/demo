// import styles from "./index.module.css";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import { marked } from "marked";

type IProps = {
  markdownText: string;
};

const Markdown = (props: IProps) => {
  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    const language = lang ?? "";
    const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
    const highlighted = hljs.highlight(text, { language: validLanguage }).value;
    return `<pre><code class="hljs ${validLanguage}" style="border-radius: 5px">${highlighted}</code></pre>`;
  };

  const markdownText = props.markdownText;
  marked.setOptions({ renderer });
  const html = marked(markdownText);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      // className={styles.mark}
    ></div>
  );
};

export default Markdown;
