const fs = require('fs');
const path = require('path');
const root = __dirname;

function getFileContentArr(file) {
  const content = fs.readFileSync(file, {
    encoding: 'utf8'
  });
  return content.split('\n');;
}

/* 
  格式化分析表，数据结构如下
  {
    a: {
      0: {
        action: s,
        target: 3
      }
    }
  }
*/
function formatAnalysisTable(arr) {
  const ans = {};
  arr.forEach(line => {
    const [status, char, action, target] = line.split(' ');
    ans[char] = ans[char] || {};
    ans[char][status] = ans[char][status] || {};
    ans[char][status]['action'] = action;
    ans[char][status]['target'] = target;
  })
  return ans;
}

function formatGrammar(grammar) {
  const ans = [''];   // ans[0] 默认为空文法，使第 i 条文法直接对应为 ans[i]
  grammar.forEach(line => {
    const [value, expStr] = line.split('->').map(item => item.trim());
    const exp = expStr.split('|').map(item => item.trim()); 
    ans.push({
      value,
      exp
    })
  });
  return ans;
}

function isDef(str) {
  return str !== null && str !== undefined;
}

function analyze(str, table, grammar) {
  const inputArr = Array.from(str);
  const charStack = ['#'];
  const statusStack = [0];
  const descArr = ['初始状态'];
  while(1) {
    const topStatus = statusStack[statusStack.length - 1];
    const cur = inputArr[0];
    const { action, target } = table[cur][topStatus];
    print(statusStack, charStack, inputArr, descArr);
    const res = judgeAction(action, target, table, grammar, statusStack, charStack, inputArr, descArr, false);
    if (res) {
      return;
    }
  }
}

function judgeAction(action, target, table, grammar, statusStack, charStack, inputArr, descArr, isAfterOpeR) {
  if (!isDef(action) || !isDef(target)) {
    descArr.push('分析失败');
    print(statusStack, charStack, inputArr, descArr);
    return true;
  }
  switch(action) {
    // r 操作，按文法规约符号栈 && 弹出对应的状态栈 && 规约后的值结合当前状态再次查表
    case 'r': {
      const {value, exp} = grammar[target];
      let i, start, sum;
      for (i=0; i<exp.length; i++) {
        start = charStack.join('').lastIndexOf(exp[i]);
        if (start !== -1) {
          sum = charStack.length - start;
          charStack.splice(start, sum, value);
          break;
        }
      }
      statusStack.splice(start, sum);
      const topStatus = statusStack[statusStack.length - 1];
      const { action: action1, target: target1 } = table[value][topStatus];
      descArr.push(`${action}${target}，使用文法 ${value}->${exp[i]} 进行规约`);
      judgeAction(action1, target1, table, grammar, statusStack, charStack, inputArr, descArr, true)
      break;
    }
    // s 操作和 goto 操作，添加状态 && 弹出当前输入字符并压入符号栈
    case 's':
    case 'goto': {
      statusStack.push(target);
      if (!isAfterOpeR) {
        charStack.push(inputArr.shift());
        descArr.push(`${action}${target}，状态${target}入栈`);
      } else {
        descArr[descArr.length - 1] += `，并且${action}${target}，状态${target}入栈`;
      }
      break;
    }
    // acc 操作，分析成功
    case 'acc': {
      descArr.push(`${action}${target}，分析成功`);
      print(statusStack, charStack, inputArr, descArr);
      return true;
    }
    default: {
      break;
    }
  }
}

function printOuter() {
  let index = 0;
  return function(statusStack, charStack, str, descArr) {
    if (index === 0) {
      console.log('\x1B[32m%s\x1B[0m', '索引\t\t状态栈\t\t符号栈\t\t输入序列\t\t操作说明');
    }
    console.log(`${index}\t\t${statusStack.join(' ')}\t\t${charStack.join(' ')}\t\t${str.join('')}\t\t${descArr[index]}`);
    index++;
  }
}

const print = printOuter();

(function main() {
  const contentArr = getFileContentArr(path.resolve(root, './rules.txt'));
  const analysisTable = formatAnalysisTable(contentArr);
  console.log(analysisTable);
  const grammarContentArr = getFileContentArr(path.resolve(root, './grammar.txt'));
  const grammarArr = formatGrammar(grammarContentArr);
  const tesContenttArr = getFileContentArr(path.resolve(root, './test/demo.txt'));
  console.log('\x1B[32m%s\x1B[0m', `${grammarContentArr.join('\n')}\n使用上述文法对以下输入样例进行校验`);
  tesContenttArr.forEach(item => {
    console.log('\x1B[31m%s\x1B[0m', `\n${item}`);
    analyze(item, analysisTable, grammarArr);
  })
})()
